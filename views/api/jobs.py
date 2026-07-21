"""
Job and project interaction routes.

Covers the User Jobs widget (squeue/scontrol) and the Accounts widget
(myproject, set default account, node/CPU utilization via pestat/squeue).

Parser functions are kept in this file since they're specific to this domain
and have no use elsewhere.
"""
import os
import re
import subprocess
import logging
from flask import request, jsonify
from . import api
from .cache import TTLCache
from .utils import parse_key_value_tokens, parse_positive_int, run_process_output, safe_int

_slurm_cache = TTLCache()
_HISTORICAL_STATES = {"completed", "complete", "failed", "fail", "cancelled", "canceled", "timeout", "history", "historical"}
_SUMMARY_HISTORY_WINDOW = "24h"
_DEFAULT_HISTORY_WINDOW = "24h"
_ACTIVE_LIST_TTL = 10
_SUMMARY_TTL = 20
_SACCT_TTL = 300

# ---------------------------------------------------------------------------
# Output parsers — these translate raw CLI output into structured dicts
# ---------------------------------------------------------------------------

def _parse_scontrol_output(output):
    """Parse `scontrol show job <jobid>` output into a flat dict."""
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
    }

    for key, value in parse_key_value_tokens(output).items():
        if key in key_map:
            job_info[key_map[key]] = value

        elif key == "ReqTRES":
            gpu_match = re.search(r"gres/gpu=(\d+)", value)
            job_info["gpus"] = int(gpu_match.group(1)) if gpu_match else 0

    job_info.setdefault("gpus", 0)
    return {"job_details": job_info}


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
        "CG": "Completing",
        "COMPLETING": "Completing",
        "S": "Suspended",
        "SUSPENDED": "Suspended",
    }
    return state_map.get(normalized, normalized.title())


def _parse_gpu_count(value):
    if not value or value in {"N/A", "(null)"}:
        return 0

    gpu_match = re.search(r"(?:gpu|gres/gpu)[:=](\d+)", str(value))
    if gpu_match:
        return int(gpu_match.group(1))

    return safe_int(value, 0)


def _run_slurm_command(command, timeout=20):
    return run_process_output(command, timeout=timeout)


def _run_cached_slurm_command(command, ttl_seconds, timeout=20):
    key = ("slurm-command", tuple(command))
    return _slurm_cache.get_or_set(
        key,
        ttl_seconds,
        lambda: _run_slurm_command(command, timeout=timeout),
    )


def _invalidate_active_job_caches():
    def _is_active_job_cache_key(key):
        if not isinstance(key, tuple) or not key:
            return False

        if key[0] == "jobs-summary":
            return True

        if key[0] != "slurm-command" or len(key) < 2:
            return False

        command = key[1]
        return bool(command) and command[0] == "squeue"

    return _slurm_cache.invalidate_matching(_is_active_job_cache_key)


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
            "runtime": runtime,
            "time_limit": time_limit,
            "submit_time": submit_time,
            "reason": reason,
            "source": "squeue",
        })

    return jobs


def _parse_sacct_details(output):
    jobs = []
    seen = set()

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
            elapsed,
            time_limit,
            submit_time,
            exit_code,
        ) = fields[:12]

        # Skip batch/extern/step records so each Slurm job appears once.
        base_job_id = job_id.split(".")[0]
        if "." in job_id or base_job_id in seen:
            continue

        seen.add(base_job_id)
        jobs.append({
            "job_id": base_job_id,
            "job_name": job_name,
            "user": user,
            "account": account,
            "partition": partition,
            "state": _normalize_job_state(state),
            "state_raw": state,
            "nodes": safe_int(nodes, 0),
            "cpus": safe_int(cpus, 0),
            "gpus": 0,
            "runtime": elapsed,
            "time_limit": time_limit,
            "submit_time": submit_time,
            "exit_code": exit_code,
            "source": "sacct",
        })

    return jobs


def _merge_job_records(active_jobs, historical_jobs):
    merged = {job["job_id"]: job for job in historical_jobs}
    merged.update({job["job_id"]: job for job in active_jobs})
    return list(merged.values())


def _get_squeue_jobs(user=None):
    command = [
        "squeue",
        "--noheader",
        "--format=%i|%j|%u|%a|%P|%t|%D|%C|%b|%M|%l|%V|%R",
    ]

    if user and user != "all":
        command.extend(["-u", user])

    output = _run_cached_slurm_command(command, _ACTIVE_LIST_TTL)
    return _parse_squeue_details(output)


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
    command = [
        "sacct",
        "--noheader",
        "--parsable2",
        f"--starttime={_normalize_history_window(history_window)}",
        "--format=JobID,JobName,User,Account,Partition,State,NNodes,NCPUS,Elapsed,Timelimit,Submit,ExitCode",
    ]

    if all_users:
        command.append("--allusers")
    else:
        selected_user = user or os.getenv("USER")
        if selected_user:
            command.extend(["--user", selected_user])

    output = _run_cached_slurm_command(command, _SACCT_TTL, timeout=30)
    return _parse_sacct_details(output)


def _get_job_detail(job_id):
    output = _run_slurm_command(["scontrol", "show", "job", str(job_id)])
    details = _parse_scontrol_output(output)["job_details"]
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
        "runtime": details.get("time_elapsed"),
        "time_limit": details.get("time_requested"),
        "exit_code": details.get("exit_code"),
        "nodes": safe_int(details.get("node_count"), 0),
        "cpus": safe_int(details.get("cores"), 0),
        "gpus": details.get("gpus", 0),
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


def _filter_jobs(jobs, state="", partition="", user="", account="", search=""):
    search_value = (search or "").strip().lower()
    partition_value = (partition or "").strip().lower()
    user_value = (user or "").strip().lower()
    account_value = (account or "").strip().lower()

    filtered = []
    for job in jobs:
        if not _state_matches_filter(job.get("state") or "", state):
            continue
        if partition_value and str(job.get("partition") or "").lower() != partition_value:
            continue
        if user_value and user_value != "all" and str(job.get("user") or "").lower() != user_value:
            continue
        if account_value and str(job.get("account") or "").lower() != account_value:
            continue
        if search_value:
            haystack = " ".join(
                str(job.get(key) or "").lower()
                for key in ["job_id", "job_name", "user", "account", "partition", "state"]
            )
            if search_value not in haystack:
                continue

        filtered.append(job)

    return filtered


def _is_history_state(state):
    normalized = (state or "").strip().lower()
    return normalized in _HISTORICAL_STATES


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
            active_jobs = _get_squeue_jobs()
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


def _parse_project_accounts(output):
    """Parse default `myproject` output into a list of project account records."""
    lines = output.split("\n")
    start = next((i for i, l in enumerate(lines) if "|  Account" in l), -1)

    if start == -1 or len(lines) <= start + 2:
        return {"error": "Unexpected output format from myproject"}

    projects = []

    for line in lines[start + 2:]:
        if line.strip().startswith("|"):
            fields = [f.strip() for f in line.split("|")[1:-1]]
            if len(fields) == 7:
                projects.append({
                    "account":          fields[0],
                    "fy":               fields[1],
                    "default":          fields[2],
                    "allocation":       float(fields[3]) if fields[3].replace('.', '', 1).isdigit() else 0.0,
                    "used_pending_sus": float(fields[4]) if fields[4].replace('.', '', 1).isdigit() else 0.0,
                    "balance":          float(fields[5]) if fields[5].replace('.', '', 1).isdigit() else 0.0,
                    "pi":               fields[6],
                })
    return {"projects": projects}

def _parse_pending_jobs(output):
    """Parse `myproject -p <account>` output into a list of pending job records."""
    jobs = []
    for line in output.split("\n")[2:]:
        if line.strip().startswith("|") and len(line.split("|")) >= 6:
            fields = [f.strip() for f in line.split("|")[1:-1]]
            if len(fields) == 5:
                jobs.append({
                    "job_id":           fields[0],
                    "state":            fields[1],
                    "cores":            fields[2],
                    "effective_cores":  fields[3],
                    "walltime_hours":   fields[4],
                })
    return {"pending_jobs": jobs}


def _parse_job_history(output):
    """Parse `myproject -j <account>` output into a list of historical job records."""
    lines = output.split("\n")
    start = next((i for i, l in enumerate(lines) if "JobID" in l and "SubmitTime" in l), -1)

    if start == -1 or len(lines) <= start + 1:
        return {"error": "Unexpected output format from myproject"}

    history = []
    for line in lines[start + 1:]:
        fields = [f.strip() for f in line.split("|") if f.strip()]
        if len(fields) >= 8:
            history.append({
                "job_id":       fields[1],
                "submit_time":  fields[3],
                "start_time":   fields[4],
                "end_time":     fields[5],
                "walltime":     fields[6],
                "total_slots":  fields[7],
                "used_sus":     fields[8],
            })

    return {"job_history": history}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@api.route('/projectinfo', methods=['GET'])
def get_projectinfo():
    """Retrieve project accounts, job history, or pending jobs via myproject."""
    try:
        account      = request.args.get("account")
        job_history  = request.args.get("job_history")
        pending_jobs = request.args.get("pending_jobs")

        if pending_jobs and account:
            command = f"/sw/local/bin/myproject -p {account}"
        elif job_history and account:
            command = f"/sw/local/bin/myproject -j {account}"
        else:
            command = "/sw/local/bin/myproject"

        logging.info(f"Executing: {command}")
        result = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT)
        output = result.decode("utf-8").strip()

        response_data = {"executed_command": command, "raw_output": output}

        if pending_jobs and account:
            response_data["pending_jobs"] = _parse_pending_jobs(output)
        elif job_history and account:
            response_data["job_history"] = _parse_job_history(output)
        else:
            response_data["projects"] = _parse_project_accounts(output)

        return jsonify(response_data), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Command failed: {e.output.decode('utf-8')}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/set_default_account', methods=['POST'])
def set_default_account():
    try:
        account_no = request.json.get("account_no")
        if not account_no:
            return jsonify({"error": "Missing account_no"}), 400

        command = f"/sw/local/bin/myproject -d {account_no}"
        result = subprocess.run(
            command, shell=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8'
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip()
            return jsonify({"error": f"Failed to set default account: {error_msg}"}), 500

        return jsonify({"message": f"Default account set to {account_no} successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/jobs", methods=["GET"])
def get_user_jobs():
    try:
        jobs = _get_squeue_jobs(user=os.getenv("USER"))
        return jsonify({"jobs": jobs}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/jobs/list", methods=["GET"])
def get_jobs_list():
    """Return a paginated job list without per-job scontrol enrichment."""
    try:
        page = parse_positive_int(request.args.get("page"), 1)
        page_size = parse_positive_int(request.args.get("page_size"), 50, maximum=200)
        state = request.args.get("state", "active")
        partition = request.args.get("partition", "")
        user = request.args.get("user", "")
        account = request.args.get("account", "")
        search = request.args.get("search", "")
        history_window = request.args.get("history_window", _DEFAULT_HISTORY_WINDOW)
        all_users = request.args.get("all_users", "").lower() in {"1", "true", "yes"} or user == "all"

        if _is_history_state(state):
            jobs = _get_sacct_jobs(
                history_window=history_window,
                user=None if all_users else user or os.getenv("USER"),
                all_users=all_users,
            )
        else:
            jobs = _get_squeue_jobs(user=None if user == "all" else user or None)

        filtered_jobs = _filter_jobs(
            jobs,
            state=state,
            partition=partition,
            user="" if user == "all" else user,
            account=account,
            search=search,
        )
        page_jobs, total, has_next = _paginate_jobs(filtered_jobs, page, page_size)

        return jsonify({
            "jobs": page_jobs,
            "page": page,
            "page_size": page_size,
            "total": total,
            "has_next": has_next,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/jobs/details", methods=["GET"])
def get_jobs_details():
    """Legacy route kept for compatibility; prefer /jobs/list and /jobs/<job_id>."""
    try:
        job_id = request.args.get("job_id")
        if job_id:
            return jsonify({"error": "Use /api/jobs/<job_id> for job details"}), 410

        errors = []
        active_jobs = []

        try:
            active_jobs = _get_squeue_jobs()
        except Exception as e:
            errors.append(f"squeue: {str(e)}")

        response = {
            "jobs": active_jobs,
            "summary": _get_jobs_summary_cached(),
        }

        if errors:
            response["warnings"] = errors

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/jobs/past_jobs", methods=["GET"])
def get_past_user_jobs():
    """Return the current user's recent jobs, newest first."""
    try:
        page = parse_positive_int(request.args.get("page"), 1)
        page_size = parse_positive_int(request.args.get("page_size"), 25, maximum=200)

        jobs = _get_sacct_jobs(
            history_window=_DEFAULT_HISTORY_WINDOW,
            user=os.getenv("USER"),
            all_users=False,
        )
        jobs.sort(key=lambda job: job.get("submit_time") or "", reverse=True)
        page_jobs, total, has_next = _paginate_jobs(jobs, page, page_size)

        return jsonify({
            "jobs": page_jobs,
            "page": page,
            "total": total,
            "page_size": page_size,
            "has_next": has_next,
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
        def _count(cmd):
            return _slurm_cache.get_or_set(
                ("shell-count", cmd),
                _SUMMARY_TTL,
                lambda: int(subprocess.check_output(cmd, shell=True, timeout=20).decode("utf-8").strip()),
            )

        allocated_nodes = _count("/sw/local/bin/pestat -s alloc | tail -n+4 | wc -l")
        mixed_nodes     = _count("/sw/local/bin/pestat -s mix  | tail -n+4 | wc -l")
        idle_nodes      = _count("/sw/local/bin/pestat -s idle | tail -n+4 | wc -l")

        allocated_cpus = _count(
            "/sw/local/bin/pestat -s alloc,mix,idle | tail -n+4 | awk '{print $4}' "
            "| awk 'NR>3' | awk '{s+=$1} END {printf \"%.0f\", s}'"
        )

        total_cpus = _count(
            "/sw/local/bin/pestat -s alloc,mix,idle | tail -n+4 | awk '{print $5}' "
            "| awk 'NR>3' | awk '{s+=$1} END {printf \"%.0f\", s}'"
        )

        running_jobs = _count("/usr/bin/squeue --noheader --states=RUNNING | wc -l")
        pending_jobs = _count("/usr/bin/squeue --noheader --states=PENDING | wc -l")

        return jsonify({
            "nodes":  {"allocated": allocated_nodes, "mixed": mixed_nodes, "idle": idle_nodes},
            "cores":  {"allocated": allocated_cpus,  "idle": total_cpus - allocated_cpus},
            "jobs":   {"running": running_jobs, "pending": pending_jobs},
        }), 200

    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Command failed: {e.output.decode('utf-8')}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
