"""Slurm job listing, detail, cancellation, summary, and utilization routes."""
import os
import re
import subprocess
from flask import request, jsonify
from . import api
from .cache import TTLCache
from .slurm_jobs import get_scontrol_job_fields, parse_scontrol_job_output
from .utils import parse_positive_int, run_process_output, safe_int

_slurm_cache = TTLCache()
_SUMMARY_HISTORY_WINDOW = "24h"
_DEFAULT_HISTORY_WINDOW = "24h"
_ACTIVE_LIST_TTL = 10
_SUMMARY_TTL = 20
_SACCT_TTL = 300
_PAST_JOB_SORTS = {
    "newest",
    "oldest",
    "status_asc",
    "status_desc",
    "partition_asc",
    "partition_desc",
}
_SACCT_FIELDS = (
    "JobID", "JobName", "User", "Account", "Partition", "State", "NNodes",
    "NCPUS", "ReqCPUS", "AllocCPUS", "ReqMem", "NodeList", "ReqTRES",
    "AllocTRES", "Elapsed", "Timelimit", "Submit", "Start", "End",
    "TotalCPU", "UserCPU", "SystemCPU", "MaxRSS", "MaxRSSNode",
    "MaxDiskRead", "MaxDiskReadNode", "MaxDiskWrite", "MaxDiskWriteNode",
    "ExitCode", "DerivedExitCode", "WorkDir", "StdOut", "StdErr",
)
_SACCT_BASE_FIELD_COUNT = 30
_SACCT_USAGE_FIELDS = {
    "total_cpu": ("duration", None),
    "user_cpu": ("duration", None),
    "system_cpu": ("duration", None),
    "max_rss": ("size", "max_rss_node"),
    "max_disk_read": ("size", "max_disk_read_node"),
    "max_disk_write": ("size", "max_disk_write_node"),
}

# ---------------------------------------------------------------------------
# Output parsers — these translate raw CLI output into structured dicts
# ---------------------------------------------------------------------------

def _map_scontrol_fields(fields):
    """Map raw scontrol fields to the job drawer's field names."""
    job_info = {}
    key_map = {
        "JobId":     "job_id",
        "JobName":   "job_name",
        "UserId":    "user_group",
        "Account":   "user_account",
        "JobState":  "state",
        "Reason":    "reason",
        "ExitCode":  "exit_code",
        "RunTime":   "time_elapsed",
        "TimeLimit": "time_requested",
        "StartTime": "start_time",
        "EndTime":   "end_time",
        "Partition": "partition",
        "NodeList":  "nodelist",
        "NumNodes":  "node_count",
        "NumCPUs":   "cores",
        "NumTasks":  "task_count",
        "Command":   "submit_line",
        "WorkDir":   "submit_dir",
        "StdOut":    "stdout_path",
        "StdErr":    "stderr_path",
        "ReqTRES":   "req_tres",
        "AllocTRES": "alloc_tres",
    }

    for key, value in fields.items():
        if key in key_map:
            job_info[key_map[key]] = value

        if key == "ReqTRES":
            job_info["gpus"] = _parse_gpu_count(value)
        elif key == "AllocTRES":
            job_info["allocated_gpus"] = _parse_gpu_count(value)

    job_info.setdefault("gpus", 0)
    return job_info


def _parse_scontrol_output(output):
    """Parse `scontrol show job -o <jobid>` output into drawer fields."""
    job_info = _map_scontrol_fields(parse_scontrol_job_output(output))
    return {"job_details": job_info}


def _parse_tres_metric(value, metric):
    """Return one numeric/text value from a Slurm TRES list."""
    match = re.search(rf"(?:^|,){re.escape(metric)}=([^,]+)", str(value or ""))
    return match.group(1) if match else None


def _normalize_job_state(state):
    """Convert Slurm short codes and long states into display-ready states."""
    if not state:
        return "Unknown"

    normalized = state.upper().split()[0]
    state_map = {
        "R": "Running",
        "RUNNING": "Running",
        "PD": "Pending",
        "PENDING": "Pending",
        "F": "Failed",
        "FAILED": "Failed",
        "CA": "Cancelled",
        "CANCELLED": "Cancelled",
        "CD": "Completed",
        "COMPLETED": "Completed",
        "TO": "Timeout",
        "TIMEOUT": "Timeout",
        "TIMEOUT+": "Timeout",
        "OUT_OF_MEMORY": "Out of memory",
        "OOM": "Out of memory",
        "NODE_FAIL": "Node failure",
        "PREEMPTED": "Preempted",
        "BOOT_FAIL": "Boot failure",
        "DEADLINE": "Deadline",
        "REVOKED": "Revoked",
        "CG": "Completing",
        "COMPLETING": "Completing",
        "S": "Suspended",
        "SUSPENDED": "Suspended",
    }
    return state_map.get(normalized, normalized.title())


def _parse_gpu_count(value):
    """Return the total GPUs from Slurm TRES or GRES output.

    Slurm reports generic requests as ``gres/gpu=1`` or ``gpu:1`` and
    typed requests as ``gres/gpu:h100=1`` or ``gpu:h100:1``.  A request
    can also contain more than one typed GPU entry, so add every entry
    rather than returning only the first match.
    """
    if not value or value in {"N/A", "(null)"}:
        return 0

    text = str(value)
    # Slurm commonly emits both the generic total and its typed breakdown,
    # e.g. ``gres/gpu=1,gres/gpu:a100=1``.  Those are two descriptions of
    # the same allocation, not two GPUs, so prefer the generic total.
    generic_tres = re.findall(r"(?:^|,)gres/gpu=(\d+)", text)
    if generic_tres:
        return sum(int(count) for count in generic_tres)

    typed_tres = re.findall(r"(?:^|,)gres/gpu(?:[:/][^=,]+)=(\d+)", text)
    if typed_tres:
        return sum(int(count) for count in typed_tres)

    generic_gres = re.findall(r"(?:^|,)(?:gres/)?gpu:(\d+)(?:\([^)]*\))?(?=,|$)", text)
    if generic_gres:
        return sum(int(count) for count in generic_gres)

    typed_gres = re.findall(r"(?:^|,)(?:gres/)?gpu:[^:,()]+:(\d+)", text)
    if typed_gres:
        return sum(int(count) for count in typed_gres)

    return safe_int(text, 0)


def _slurm_usage_sort_value(value, value_type):
    """Convert sacct usage values to comparable base units."""
    if not value or str(value).strip().upper() in {"N/A", "(NULL)", "UNKNOWN"}:
        return None

    text = str(value).strip()
    if value_type == "size":
        match = re.fullmatch(r"(\d+(?:\.\d+)?)\s*([KMGTPE]?)B?", text, re.IGNORECASE)
        if not match:
            return None
        units = {"": 0, "K": 1, "M": 2, "G": 3, "T": 4, "P": 5, "E": 6}
        return float(match.group(1)) * (1024 ** units[match.group(2).upper()])

    match = re.fullmatch(
        r"(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)", text
    )
    if not match:
        return None
    days, hours, minutes, seconds = match.groups()
    return (
        safe_int(days, 0) * 86400
        + safe_int(hours, 0) * 3600
        + safe_int(minutes, 0) * 60
        + float(seconds)
    )


def _invalidate_active_job_caches():
    def _is_active_job_cache_key(key):
        if not isinstance(key, tuple) or not key:
            return False

        if key[0] in {"active-jobs", "jobs-summary", "utilization"}:
            return True
        return False

    return _slurm_cache.invalidate_matching(_is_active_job_cache_key)


def _invalidate_sacct_caches():
    """Invalidate cached historical accounting queries for a manual refresh."""
    def _is_sacct_cache_key(key):
        return isinstance(key, tuple) and bool(key) and key[0] == "sacct-jobs"

    return _slurm_cache.invalidate_matching(_is_sacct_cache_key)


def _parse_squeue_details(output):
    jobs = []

    for line in output.splitlines():
        if not line.strip():
            continue

        fields = line.split("|")
        if len(fields) < 12:
            continue

        (
            job_id,
            job_name,
            user,
            account,
            partition,
            state,
            nodes,
            cpus,
            gpus,
            runtime,
            time_limit,
            submit_time,
        ) = fields[:12]
        reason = fields[12] if len(fields) > 12 else ""
        priority = safe_int(fields[13]) if len(fields) > 13 else None

        jobs.append({
            "job_id": job_id,
            "job_name": job_name,
            "user": user,
            "account": account,
            "partition": partition,
            "state": _normalize_job_state(state),
            "state_raw": state,
            "nodes": safe_int(nodes, 0),
            "cpus": safe_int(cpus, 0),
            "gpus": _parse_gpu_count(gpus),
            "gres": None if gpus in {"", "N/A", "(null)"} else gpus,
            "runtime": runtime,
            "time_limit": time_limit,
            "submit_time": submit_time,
            "reason": reason,
            "priority": priority,
            "source": "squeue",
        })

    return jobs


def _parse_sacct_details(output):
    parent_jobs = {}
    parent_order = []
    usage_maxima = {}

    for line in output.splitlines():
        if not line.strip():
            continue

        fields = line.split("|")
        if len(fields) < 12:
            continue

        if len(fields) >= _SACCT_BASE_FIELD_COUNT:
            (
                job_id, job_name, user, account, partition, state, nodes, cpus,
                req_cpus, alloc_cpus, req_mem, node_list, req_tres, alloc_tres,
                elapsed, time_limit, submit_time, start_time, end_time, total_cpu,
                user_cpu, system_cpu, max_rss, max_rss_node, max_disk_read,
                max_disk_read_node, max_disk_write, max_disk_write_node, exit_code,
                derived_exit_code,
            ) = fields[:_SACCT_BASE_FIELD_COUNT]
            work_dir, stdout_path, stderr_path = (fields[_SACCT_BASE_FIELD_COUNT:] + ["", "", ""])[:3]
        else:
            # Continue to accept the former 12-column layout for callers that
            # supply captured/legacy sacct output directly to this parser.
            (
                job_id, job_name, user, account, partition, state, nodes, cpus,
                elapsed, time_limit, submit_time, exit_code,
            ) = fields[:12]
            (
                req_cpus, alloc_cpus, req_mem, node_list, req_tres, alloc_tres,
                start_time, end_time, total_cpu, user_cpu, system_cpu, max_rss,
                max_rss_node, max_disk_read, max_disk_read_node, max_disk_write,
                max_disk_write_node, derived_exit_code,
            ) = ("",) * 18
            work_dir, stdout_path, stderr_path = "", "", ""

        base_job_id = job_id.split(".")[0]
        record = {
            "job_id": base_job_id,
            "job_name": job_name,
            "user": user,
            "account": account,
            "partition": partition,
            "state": _normalize_job_state(state),
            "state_raw": state,
            "nodes": safe_int(nodes, 0),
            "cpus": safe_int(cpus, 0),
            "req_cpus": safe_int(req_cpus, 0),
            "alloc_cpus": safe_int(alloc_cpus, 0),
            "req_mem": req_mem,
            "node_list": node_list,
            "req_tres": req_tres,
            "alloc_tres": alloc_tres,
            "gpus": _parse_gpu_count(req_tres),
            "runtime": elapsed,
            "time_limit": time_limit,
            "submit_time": submit_time,
            "start_time": start_time,
            "end_time": end_time,
            "total_cpu": total_cpu,
            "user_cpu": user_cpu,
            "system_cpu": system_cpu,
            "max_rss": max_rss,
            "max_rss_node": max_rss_node,
            "max_disk_read": max_disk_read,
            "max_disk_read_node": max_disk_read_node,
            "max_disk_write": max_disk_write,
            "max_disk_write_node": max_disk_write_node,
            "exit_code": exit_code,
            "derived_exit_code": derived_exit_code,
            "source": "sacct",
        }
        if work_dir:
            record["working_directory"] = work_dir
        if stdout_path:
            record["stdout_path"] = stdout_path
        if stderr_path:
            record["stderr_path"] = stderr_path

        # Usage can be reported on any child step, and step names differ by
        # cluster and workload. Aggregate by the base ID instead of naming
        # particular steps. Node fields travel with their winning metric.
        job_usage = usage_maxima.setdefault(base_job_id, {})
        for metric, (value_type, node_field) in _SACCT_USAGE_FIELDS.items():
            sort_value = _slurm_usage_sort_value(record[metric], value_type)
            if sort_value is None:
                continue
            current = job_usage.get(metric)
            if current is None or sort_value > current[0]:
                job_usage[metric] = (
                    sort_value,
                    record[metric],
                    record[node_field] if node_field else None,
                )

        # Only parent jobs are returned, preserving the existing one-row-per-job behavior.
        if "." in job_id or base_job_id in parent_jobs:
            continue
        parent_jobs[base_job_id] = record
        parent_order.append(base_job_id)

    jobs = []
    for base_job_id in parent_order:
        job = parent_jobs[base_job_id]
        for metric, (_, node_field) in _SACCT_USAGE_FIELDS.items():
            maximum = usage_maxima.get(base_job_id, {}).get(metric)
            if maximum is None:
                continue
            job[metric] = maximum[1]
            if node_field:
                job[node_field] = maximum[2]
        jobs.append(job)

    return jobs


def _merge_job_records(active_jobs, historical_jobs):
    merged = {job["job_id"]: job for job in historical_jobs}
    merged.update({job["job_id"]: job for job in active_jobs})
    return list(merged.values())


def get_active_jobs(user=None):
    """Return normalized active Slurm jobs, using the shared short-lived cache."""
    command = [
        "squeue",
        "--noheader",
        "--format=%i|%j|%u|%a|%P|%t|%D|%C|%b|%M|%l|%V|%R|%Q",
    ]

    if user and user != "all":
        command.extend(["-u", user])

    cache_key = ("active-jobs", user or "all")
    return _slurm_cache.get_or_set(
        cache_key,
        _ACTIVE_LIST_TTL,
        lambda: _parse_squeue_details(run_process_output(command, timeout=20)),
    )


def _normalize_history_window(window):
    normalized = (window or _DEFAULT_HISTORY_WINDOW).strip().lower()
    allowed_windows = {
        "24h": "now-1days",
        "1d": "now-1days",
        "7d": "now-7days",
        "14d": "now-14days",
        "30d": "now-30days",
    }
    return allowed_windows.get(normalized, allowed_windows[_DEFAULT_HISTORY_WINDOW])


def _get_sacct_jobs(history_window=None, user=None, all_users=False):
    normalized_window = _normalize_history_window(history_window)
    selected_user = None if all_users else user or os.getenv("USER")
    command = [
        "sacct",
        "--noheader",
        "--parsable2",
        f"--starttime={normalized_window}",
        f"--format={','.join(_SACCT_FIELDS)}",
    ]

    if all_users:
        command.append("--allusers")
    else:
        if selected_user:
            command.extend(["--user", selected_user])

    cache_key = ("sacct-jobs", normalized_window, selected_user, bool(all_users))
    return _slurm_cache.get_or_set(
        cache_key,
        _SACCT_TTL,
        lambda: _parse_sacct_details(run_process_output(command, timeout=30)),
    )


def _get_job_detail(job_id):
    raw_fields = get_scontrol_job_fields(job_id)
    details = _map_scontrol_fields(raw_fields)
    return {
        "job_id": details.get("job_id", str(job_id)),
        "job_name": details.get("job_name"),
        "user": details.get("user_group", "").split("(")[0],
        "account": details.get("user_account"),
        "partition": details.get("partition"),
        "state": _normalize_job_state(details.get("state")),
        "node_list": details.get("nodelist"),
        "working_directory": details.get("submit_dir"),
        "submit_command": details.get("submit_line"),
        "stdout_path": details.get("stdout_path"),
        "stderr_path": details.get("stderr_path"),
        "runtime": details.get("time_elapsed"),
        "time_limit": details.get("time_requested"),
        "exit_code": details.get("exit_code"),
        "nodes": safe_int(details.get("node_count"), 0),
        "cpus": safe_int(details.get("cores"), 0),
        "req_cpus": safe_int(_parse_tres_metric(details.get("req_tres"), "cpu"), 0),
        "alloc_cpus": safe_int(_parse_tres_metric(details.get("alloc_tres"), "cpu"), 0),
        "req_nodes": safe_int(_parse_tres_metric(details.get("req_tres"), "node"), 0),
        "alloc_nodes": safe_int(_parse_tres_metric(details.get("alloc_tres"), "node"), 0),
        "req_mem": _parse_tres_metric(details.get("req_tres"), "mem"),
        "alloc_mem": _parse_tres_metric(details.get("alloc_tres"), "mem"),
        "gpus": details.get("gpus", 0),
        "allocated_gpus": details.get("allocated_gpus", 0),
        "raw": details,
    }


def _build_jobs_summary(jobs):
    states = ["Running", "Pending", "Completed", "Failed", "Cancelled", "Timeout"]
    state_counts = {state: 0 for state in states}
    partition_counts = {}
    submitted_counts = {}

    for job in jobs:
        state = job.get("state") or "Unknown"
        if state in state_counts:
            state_counts[state] += 1
        elif state.startswith("Timeout"):
            state_counts["Timeout"] += 1

        partition = job.get("partition") or "Unknown"
        partition_counts[partition] = partition_counts.get(partition, 0) + 1

        submit_day = (job.get("submit_time") or "Unknown").split("T")[0].split(" ")[0]
        submitted_counts[submit_day] = submitted_counts.get(submit_day, 0) + 1

    return {
        "kpis": {
            "running": state_counts["Running"],
            "pending": state_counts["Pending"],
            "failed": state_counts["Failed"],
            "completed": state_counts["Completed"],
        },
        "state_distribution": state_counts,
        "jobs_by_partition": partition_counts,
        "submitted_over_time": dict(sorted(submitted_counts.items())),
    }


def _state_matches_filter(job_state, state_filter):
    normalized_filter = (state_filter or "").strip().lower()
    if not normalized_filter or normalized_filter == "all":
        return True
    if normalized_filter == "active":
        return job_state in {"Running", "Pending", "Completing", "Suspended"}

    return job_state.lower() == _normalize_job_state(normalized_filter).lower()


def _filter_jobs(jobs, state="", partition="", search="", search_fields=None):
    search_value = (search or "").strip().lower()
    partition_value = (partition or "").strip().lower()

    filtered = []
    for job in jobs:
        if not _state_matches_filter(job.get("state") or "", state):
            continue
        if partition_value and str(job.get("partition") or "").lower() != partition_value:
            continue
        if search_value:
            haystack = " ".join(
                str(job.get(key) or "").lower()
                for key in (search_fields or ["job_id", "job_name", "partition", "state"])
            )
            if search_value not in haystack:
                continue

        filtered.append(job)

    return filtered


def _sort_past_jobs(jobs, sort="newest"):
    """Sort past jobs predictably, keeping blank text values at the end."""
    selected_sort = sort if sort in _PAST_JOB_SORTS else "newest"

    # Establish the secondary order first; Python's sort is stable.
    sorted_jobs = sorted(
        jobs,
        key=lambda job: job.get("submit_time") or "",
        reverse=True,
    )
    if selected_sort == "newest":
        return sorted_jobs
    if selected_sort == "oldest":
        return sorted(
            jobs,
            key=lambda job: (
                not bool(job.get("submit_time")),
                job.get("submit_time") or "",
            ),
        )

    field, direction = selected_sort.rsplit("_", 1)
    if field == "status":
        field = "state"
    present = [job for job in sorted_jobs if str(job.get(field) or "").strip()]
    missing = [job for job in sorted_jobs if not str(job.get(field) or "").strip()]
    present.sort(
        key=lambda job: str(job.get(field)).casefold(),
        reverse=direction == "desc",
    )
    return present + missing


def _past_job_filter_options(jobs):
    """Return complete filter choices for the selected history window."""
    return {
        "states": sorted(
            {str(job.get("state")) for job in jobs if job.get("state")},
            key=str.casefold,
        ),
        "partitions": sorted(
            {str(job.get("partition")) for job in jobs if job.get("partition")},
            key=str.casefold,
        ),
    }


def _paginate_jobs(jobs, page, page_size):
    total = len(jobs)
    start = (page - 1) * page_size
    end = start + page_size
    return jobs[start:end], total, end < len(jobs)


def _get_jobs_summary_cached():
    summary_user = os.getenv("USER")

    def _load():
        errors = []
        active_jobs = []
        historical_jobs = []

        try:
            active_jobs = get_active_jobs()
        except Exception as e:
            errors.append(f"squeue: {str(e)}")

        try:
            historical_jobs = _get_sacct_jobs(history_window=_SUMMARY_HISTORY_WINDOW, user=summary_user)
        except Exception as e:
            errors.append(f"sacct: {str(e)}")

        jobs = _merge_job_records(active_jobs, historical_jobs)
        response = _build_jobs_summary(jobs)
        response["total_jobs"] = len(jobs)

        if errors:
            response["warnings"] = errors

        return response

    return _slurm_cache.get_or_set(("jobs-summary", _SUMMARY_HISTORY_WINDOW, summary_user), _SUMMARY_TTL, _load)


@api.route("/jobs", methods=["GET"])
def get_user_jobs():
    try:
        if request.args.get("refresh", "").lower() in {"1", "true", "yes"}:
            _invalidate_active_job_caches()
        jobs = get_active_jobs(user=os.getenv("USER"))
        return jsonify({"jobs": jobs}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/jobs/past_jobs", methods=["GET"])
def get_past_user_jobs():
    """Return searchable, filterable history for the current user."""
    try:
        if request.args.get("refresh", "").lower() in {"1", "true", "yes"}:
            _invalidate_sacct_caches()
        page = parse_positive_int(request.args.get("page"), 1)
        page_size = parse_positive_int(request.args.get("page_size"), 25, maximum=200)
        history_window = request.args.get("history_window", _DEFAULT_HISTORY_WINDOW)
        search = request.args.get("search", "")
        state = request.args.get("state", "")
        partition = request.args.get("partition", "")
        selected_sort = request.args.get("sort", "newest").strip().lower()
        if selected_sort not in _PAST_JOB_SORTS:
            selected_sort = "newest"

        jobs = _get_sacct_jobs(
            history_window=history_window,
            user=os.getenv("USER"),
            all_users=False,
        )
        filter_options = _past_job_filter_options(jobs)
        filtered_jobs = _filter_jobs(
            jobs,
            state=state,
            partition=partition,
            search=search,
            search_fields=("job_id", "job_name"),
        )
        sorted_jobs = _sort_past_jobs(filtered_jobs, selected_sort)
        page_jobs, total, has_next = _paginate_jobs(sorted_jobs, page, page_size)

        return jsonify({
            "jobs": page_jobs,
            "page": page,
            "total": total,
            "page_size": page_size,
            "has_next": has_next,
            "filter_options": filter_options,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/jobs/summary", methods=["GET"])
def get_jobs_summary():
    """Return aggregate Slurm job counts for Job Explorer charts and KPIs."""
    try:
        return jsonify(_get_jobs_summary_cached()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/jobs/<job_id>", methods=["GET"])
def get_job_detail(job_id):
    """Return lazy details for one job. This is the only route using scontrol."""
    try:
        return jsonify({"job": _get_job_detail(job_id)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/cancel_job/<job_id>", methods=["POST"])
def cancel_job(job_id):
    try:
        result = subprocess.run(
            ["scancel", job_id],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8"
        )

        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip())

        # scancel changes scheduler state outside this process, so cached squeue
        # and derived summary data must be cleared before the next refresh.
        _invalidate_active_job_caches()
        return jsonify({"message": f"Job {job_id} canceled successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/utilization", methods=["GET"])
def get_utilization():
    try:
        def _load_utilization():
            pestat_output = run_process_output(
                ["/sw/local/bin/pestat", "-s", "alloc,mix,idle"],
                timeout=20,
            )
            node_counts = {"allocated": 0, "mixed": 0, "idle": 0}
            allocated_cpus = 0
            total_cpus = 0

            for line in pestat_output.splitlines():
                fields = line.split()
                if len(fields) < 5:
                    continue
                state = fields[2].strip().lower()
                state_key = {"alloc": "allocated", "mix": "mixed", "idle": "idle"}.get(state)
                if state_key is None:
                    continue
                try:
                    used_cpus = int(fields[3])
                    node_cpus = int(fields[4])
                except ValueError:
                    continue
                node_counts[state_key] += 1
                allocated_cpus += used_cpus
                total_cpus += node_cpus

            active_jobs = get_active_jobs()
            running_jobs = sum(job.get("state") == "Running" for job in active_jobs)
            pending_jobs = sum(job.get("state") == "Pending" for job in active_jobs)
            return {
                "nodes": node_counts,
                "cores": {
                    "allocated": allocated_cpus,
                    "idle": max(0, total_cpus - allocated_cpus),
                },
                "jobs": {"running": running_jobs, "pending": pending_jobs},
            }

        response = _slurm_cache.get_or_set(
            ("utilization",),
            _SUMMARY_TTL,
            _load_utilization,
        )
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
