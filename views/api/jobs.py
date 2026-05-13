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

# ---------------------------------------------------------------------------
# Output parsers — these translate raw CLI output into structured dicts
# ---------------------------------------------------------------------------

def _parse_scontrol_output(output):
    """Parse `scontrol show job <jobid>` output into a flat dict."""
    job_info = {}
    tokens = []

    for line in output.split("\n"):
        line = line.strip()

        if line:
            tokens.extend(line.split())

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

    for token in tokens:
        if "=" in token:
            key, value = token.split("=", 1)

            if key in key_map:
                job_info[key_map[key]] = value

            elif key == "ReqTRES":
                gpu_match = re.search(r"gres/gpu=(\d+)", value)
                job_info["gpus"] = int(gpu_match.group(1)) if gpu_match else 0

    job_info.setdefault("gpus", 0)
    return {"job_details": job_info}


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
        jobs = []
        result = subprocess.run(
            ["squeue", "-u", os.getenv("USER"), "--format=%i %t %D"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8"
        )

        for line in result.stdout.strip().split("\n")[1:]:
            parts = line.split()
            if len(parts) != 3:
                continue

            job_id, state, nodes = parts
            scontrol_output = subprocess.run(
                ["scontrol", "show", "job", job_id],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8"
            ).stdout
            details = _parse_scontrol_output(scontrol_output)["job_details"]

            jobs.append({
                "job_id":         job_id,
                "job_name":       details.get("job_name"),
                "state":          state,
                "cpus":           details.get("cores"),
                "nodes":          nodes,
                "gpus":           details.get("gpus"),
                "time_requested": details.get("time_requested"),
                "time_elapsed":   details.get("time_elapsed"),
                "submit_dir":     details.get("submit_dir"),
                "reason":         details.get("reason"),
            })

        return jsonify({"jobs": jobs}), 200

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
        return jsonify({"message": f"Job {job_id} canceled successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/utilization", methods=["GET"])
def get_utilization():
    try:
        def _count(cmd):
            return int(subprocess.check_output(cmd, shell=True).decode("utf-8").strip())

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


