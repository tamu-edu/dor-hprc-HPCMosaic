"""Project-account parsing and myproject API routes."""

import logging
import subprocess

from flask import jsonify, request

from . import api


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

