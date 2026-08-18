"""Slurm queue-priority inspection helpers and API route."""

import logging
import os
import re

from flask import jsonify, request

from . import api
from .jobs import get_active_jobs
from .utils import run_process_output, safe_float, safe_int


_JOB_ID_RE = re.compile(r"^[0-9]+(?:[_+][0-9]+|\.[0-9]+)?$")
_UNKNOWN_VALUES = {"", "N/A", "Unknown", "(null)", "None"}
_QUEUE_NOT_PROVIDED = object()


def _valid_job_id(job_id):
    return bool(_JOB_ID_RE.fullmatch(str(job_id or "")))


def _try_slurm_command(command):
    """Run a shared Slurm command, returning ``None`` when it is unavailable."""
    try:
        return run_process_output(command).strip()
    except Exception as exc:
        logging.warning("Slurm command failed (%s): %s", command[0], exc)
        return None


def _active_jobs(user=None):
    """Use the jobs backend's canonical cached squeue query."""
    try:
        return get_active_jobs(user=user)
    except Exception as exc:
        logging.warning("Unable to query active Slurm jobs: %s", exc)
        return None


def _get_partition_queue(partition):
    """Return a lightweight pending/running snapshot for one partition."""
    if not partition:
        return None

    output = _try_slurm_command([
        "squeue", "--noheader", "--partition", str(partition),
        "--states=PENDING,RUNNING",
        "--format=%i|%u|%a|%P|%t|%D|%C|%b|%V|%Q|%R",
    ])
    if output is None:
        return None

    jobs = []
    state_names = {"PD": "Pending", "R": "Running", "CG": "Completing"}
    for line in output.splitlines():
        fields = line.split("|", 10)
        if len(fields) != 11:
            continue
        job_id, user, account, job_partition, state, nodes, cpus, gres, submit_time, priority, reason = fields
        jobs.append({
            "job_id": job_id.strip(),
            "user": user.strip(),
            "account": account.strip(),
            "partition": job_partition.strip(),
            "state": state_names.get(state.strip(), state.strip().title()),
            "nodes": safe_int(nodes.strip(), 0),
            "cpus": safe_int(cpus.strip(), 0),
            "gres": None if gres.strip() in _UNKNOWN_VALUES else gres.strip(),
            "submit_time": None if submit_time.strip() in _UNKNOWN_VALUES else submit_time.strip(),
            "priority": safe_float(priority.strip()),
            "reason": None if reason.strip() in _UNKNOWN_VALUES else reason.strip(),
        })
    return jobs


def get_job_details(job_id):
    """Return all fields reported by ``scontrol show job -o`` for a job."""
    if not _valid_job_id(job_id):
        return None

    output = _try_slurm_command(["scontrol", "show", "job", "-o", str(job_id)])
    if not output:
        return None

    # ``-o`` emits one record per line.  Values such as Command and WorkDir may
    # contain spaces, so a plain ``split`` is not sufficient here.
    fields = {}
    # Slurm includes colon-bearing keys such as ``AllocNode:Sid``.  Treat
    # those as field boundaries so their text is not appended to the value
    # immediately before them (most visibly the Partition field).
    key_pattern = r"[A-Za-z][A-Za-z0-9_/:]*"
    pattern = rf"(?:^|\s)({key_pattern})=((?:(?!\s+{key_pattern}=).)*)"
    for key, value in re.findall(pattern, output.splitlines()[0]):
        fields[key] = value.strip()
    return fields or None


def get_priority_details(job_id):
    """Return the priority and scheduling factors reported by ``sprio``."""
    if not _valid_job_id(job_id):
        return None

    field_names = [
        "job_id", "priority", "age", "association", "fair_share",
        "job_size", "partition", "qos", "nice",
    ]
    output = _try_slurm_command([
        "sprio", "--noheader", "--jobs", str(job_id),
        "--format=%i|%Y|%A|%B|%F|%J|%P|%Q|%N",
    ])
    if not output:
        return None

    values = [value.strip() for value in output.splitlines()[0].split("|")]
    if len(values) != len(field_names):
        return None

    result = dict(zip(field_names, values))
    numeric_fields = (
        "priority", "age", "association", "fair_share", "job_size",
        "partition", "qos", "nice",
    )
    for field in numeric_fields:
        result[field] = safe_float(result[field])
    return result


def get_estimated_start(job_id):
    """Return Slurm's estimated start information for a pending job."""
    if not _valid_job_id(job_id):
        return None

    output = _try_slurm_command([
        "squeue", "--noheader", "--start", "--jobs", str(job_id),
        "--format=%i|%S|%Y|%R",
    ])
    if not output:
        return None

    values = [value.strip() for value in output.splitlines()[0].split("|", 3)]
    if len(values) != 4:
        return None
    start_time = None if values[1] in _UNKNOWN_VALUES else values[1]
    return {
        "job_id": values[0],
        "start_time": start_time,
        "start_nodes": None if values[2] in _UNKNOWN_VALUES else values[2],
        "reason": None if values[3] in _UNKNOWN_VALUES else values[3],
        "is_estimate": start_time is not None,
    }


def get_competing_jobs(job, partition_jobs=_QUEUE_NOT_PROVIDED):
    """Return pending jobs in the same partition with equal/higher priority."""
    if not job:
        return []

    partition = job.get("Partition") or job.get("partition")
    job_id = str(job.get("JobId") or job.get("JobIdRaw") or job.get("job_id") or "")
    own_priority = safe_float(job.get("Priority") or job.get("priority"))
    own_submit_time = job.get("SubmitTime") or job.get("submit_time")
    if not partition:
        return []

    active_jobs = _get_partition_queue(partition) if partition_jobs is _QUEUE_NOT_PROVIDED else partition_jobs
    if active_jobs is None:
        return None

    jobs = []
    for active_job in active_jobs:
        if (
            active_job.get("state") != "Pending"
            or active_job.get("partition") != partition
            or active_job.get("job_id") == job_id
        ):
            continue
        priority = safe_float(active_job.get("priority"))
        if own_priority is not None and (priority is None or priority < own_priority):
            continue
        # For equal-priority jobs, only jobs submitted before this one are
        # considered ahead.  This mirrors Slurm's usual FIFO tie-breaker.
        if (
            own_priority is not None
            and priority == own_priority
            and own_submit_time
            and active_job.get("submit_time")
            and active_job["submit_time"] > own_submit_time
        ):
            continue
        jobs.append({
            "job_id": active_job["job_id"],
            "user": active_job.get("user"),
            "account": active_job.get("account"),
            "partition": active_job.get("partition"),
            "priority": priority,
            "nodes": active_job.get("nodes", 0),
            "cpus": active_job.get("cpus", 0),
            "gres": active_job.get("gres"),
            "submit_time": active_job.get("submit_time") or None,
            "reason": active_job.get("reason") or None,
        })

    jobs.sort(key=lambda item: (-(item["priority"] or 0), item["submit_time"] or ""))
    return jobs


def build_queue_insight(job_id):
    """Build the complete queue-insight response for one Slurm job."""
    if not _valid_job_id(job_id):
        return {"error": "A valid job_id is required"}

    job = get_job_details(str(job_id))
    if job is None:
        return {"error": "Job not found or Slurm is unavailable", "job_id": str(job_id)}

    priority = get_priority_details(str(job_id))
    # scontrol's Priority lets queue comparison still work if sprio is
    # unavailable; sprio is authoritative when it did return a value.
    comparison_job = dict(job)
    if priority and priority.get("priority") is not None:
        comparison_job["Priority"] = priority["priority"]
    partition = comparison_job.get("Partition") or comparison_job.get("partition")
    partition_queue = _get_partition_queue(partition)
    competing = get_competing_jobs(comparison_job, partition_queue)
    statistics = get_queue_statistics(comparison_job, partition_queue)
    queue_position = statistics.get("queue_position")
    # Queue position is calculated from the complete same-partition pending
    # list.  It is the authoritative source for the count ahead; the detailed
    # competing list is best-effort and can be incomplete when Slurm omits a
    # priority field for one of its rows.
    jobs_ahead = (
        max(0, queue_position - 1)
        if queue_position is not None
        else (len(competing) if competing is not None else None)
    )

    return {
        "job_id": str(job_id),
        "job": job,
        "priority": priority,
        "estimated_start": get_estimated_start(str(job_id)),
        "competing_jobs": competing or [],
        "competing_job_count": jobs_ahead,
        **statistics,
    }


def _get_user_pending_jobs(username):
    active_jobs = _active_jobs(user=username)
    if active_jobs is None:
        return None

    return [
        {
            "job_id": job["job_id"],
            "job_name": job.get("job_name"),
            "partition": job.get("partition"),
            "reason": job.get("reason"),
        }
        for job in active_jobs
        if job.get("state") == "Pending" and _valid_job_id(job.get("job_id"))
    ]


def get_queue_statistics(job, partition_jobs=_QUEUE_NOT_PROVIDED):
    """Calculate partition queue distribution, rank, and CPU utilization."""
    partition = job.get("Partition") or job.get("partition")
    job_id = str(job.get("JobId") or job.get("JobIdRaw") or job.get("job_id") or "")
    selected_priority = safe_float(job.get("Priority") or job.get("priority"))
    if not partition:
        return {
            "cluster_average_priority": None,
            "queue_position": None,
            "partition_jobs": None,
            "partition_utilization": None,
        }

    active_jobs = _get_partition_queue(partition) if partition_jobs is _QUEUE_NOT_PROVIDED else partition_jobs
    sinfo_output = _try_slurm_command([
        "sinfo", "--noheader", "--partition", str(partition), "--format=%C",
    ])

    distribution = None if active_jobs is None else {"running": 0, "higher_priority": 0, "same_priority": 0, "lower_priority": 0}
    pending_jobs = []
    if active_jobs is not None:
        print("ACTIVE JOBS: ", active_jobs)
        for active_job in active_jobs:
            if active_job.get("partition") != partition:
                continue
            state = active_job.get("state")
            priority = safe_float(active_job.get("priority"))
            if state == "Running":
                distribution["running"] += 1
                continue
            if state != "Pending":
                continue

            pending_jobs.append({
                "job_id": active_job["job_id"],
                "priority": priority or 0,
                "submit_time": active_job.get("submit_time") or "",
            })
            if selected_priority is None or priority == selected_priority:
                distribution["same_priority"] += 1
            elif priority is not None and priority > selected_priority:
                distribution["higher_priority"] += 1
            else:
                distribution["lower_priority"] += 1

    pending_jobs.sort(key=lambda item: (-item["priority"], item["submit_time"], item["job_id"]))
    position = next(
        (index for index, item in enumerate(pending_jobs, start=1) if item["job_id"] == job_id),
        None,
    )

    cluster_priorities = [
        priority
        for active_job in (active_jobs or [])
        if active_job.get("state") == "Pending"
        for priority in [safe_float(active_job.get("priority"))]
        if priority is not None
    ]
    average_priority = (
        round(sum(cluster_priorities) / len(cluster_priorities), 2)
        if cluster_priorities else None
    )

    allocated = idle = other = total = 0
    if sinfo_output is not None:
        for line in sinfo_output.splitlines():
            values = [safe_int(value, 0) for value in line.strip().split("/")]
            if len(values) == 4:
                allocated += values[0]
                idle += values[1]
                other += values[2]
                total += values[3]
    utilization = {
        "allocated_cpus": allocated,
        "idle_cpus": idle,
        "other_cpus": other,
        "total_cpus": total,
        "percent": round((allocated / total) * 100, 2) if total else None,
    }

    return {
        "cluster_average_priority": average_priority,
        "queue_position": position,
        "partition_pending_count": len(pending_jobs) if active_jobs is not None else None,
        "partition_jobs": distribution,
        "partition_utilization": utilization,
    }


def build_user_queue_insights(username=None):
    """Return lightweight selector data for a user's pending jobs."""
    username = str(username or os.getenv("USER") or "").strip()
    if not username:
        return {"error": "Unable to determine the current user"}

    jobs = _get_user_pending_jobs(username)
    if jobs is None:
        return {"error": "Unable to query pending jobs"}
    return {"jobs": jobs, "pending_job_count": len(jobs)}


@api.route("/priority/queue-insight", methods=["GET"])
def get_queue_insights():
    job_id = request.args.get("job_id", "").strip()
    username = str(os.getenv("USER") or "").strip()
    pending_jobs = _get_user_pending_jobs(username) if username else []
    if pending_jobs is None:
        return jsonify({"error": "Unable to verify pending jobs"}), 503
    if job_id not in {job["job_id"] for job in pending_jobs}:
        return jsonify({"error": "Job is not pending or does not belong to the current user"}), 404
    result = build_queue_insight(job_id)
    return jsonify(result), (400 if result.get("error") == "A valid job_id is required" else 200)


@api.route("/priority/queue-insights", methods=["GET"])
def get_user_queue_insights():
    result = build_user_queue_insights()
    return jsonify(result), (503 if result.get("error") else 200)
