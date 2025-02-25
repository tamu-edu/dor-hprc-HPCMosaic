from flask import Blueprint, request, jsonify
import json
from sys import version as python_formatted_version
import sqlite3
import re
import os
from machine_driver_scripts.engine import Engine
from collections import OrderedDict
import subprocess
import logging  # Add this line at the top

api = Blueprint('api', __name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

@api.route('/sinfo', methods=['GET'])
def get_sinfo():
    try:
        result = subprocess.check_output("/sw/local/bin/retrieve_sinfo", shell=True, stderr=subprocess.STDOUT)
        output = result.decode("utf-8")
        print("Raw Output:", output)  # Debugging: print raw output
        return jsonify(eval(output)), 200
    except subprocess.CalledProcessError as e:
        error_message = e.output.decode("utf-8")
        return jsonify({"error": f"Command failed: {error_message}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/save_layout', methods=['POST'])
def save_layout():
    try:
        data = request.json  # Expecting a JSON payload
        layout_name = data.get("layout_name")
        layout_data = data.get("layout_data")

        if not layout_name or not layout_data:
            print("layout name", layout_name)
            print("layout data", layout_data)
            return jsonify({"error": "Invalid data :()"}), 400

        # Define the path to save the layout
        user = os.getenv("USER", "default_user")  # Fallback to 'default_user' if USER is not set
        layouts_dir = f"/scratch/user/{user}/ondemand/layouts"
        os.makedirs(layouts_dir, exist_ok=True)  # Ensure the directory exists

        layout_file_path = os.path.join(layouts_dir, f"{layout_name}.json")

        # Save the layout data as a JSON file
        with open(layout_file_path, 'w') as f:
            json.dump(layout_data, f, indent=4)

        return jsonify({"message": f"Layout {layout_name} saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/get_layouts', methods=['GET'])
def get_layouts():
    try:
        user = os.getenv("USER", "default_user")
        layouts_dir = f"/scratch/user/{user}/ondemand/layouts"
        os.makedirs(layouts_dir, exist_ok=True)  # Ensure the directory exists

        # List all JSON files in the layouts directory
        layout_files = [f for f in os.listdir(layouts_dir) if f.endswith('.json')]
        layout_names = [os.path.splitext(f)[0] for f in layout_files]

        return jsonify({"layouts": layout_names}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/load_layout', methods=['GET'])
def load_layout():
    try:
        layout_name = request.args.get("layout_name")
        if not layout_name:
            return jsonify({"error": "Missing layout name"}), 400

        user = os.getenv("USER", "default_user")
        layouts_dir = f"/scratch/user/{user}/ondemand/layouts"
        layout_file_path = os.path.join(layouts_dir, f"{layout_name}.json")

        if not os.path.exists(layout_file_path):
            return jsonify({"error": f"Layout {layout_name} does not exist"}), 404

        # Load the layout data
        with open(layout_file_path, 'r') as f:
            layout_data = json.load(f)

        return jsonify({"layout_name": layout_name, "layout_data": layout_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/showquota', methods=['GET'])
def get_quota():
    try:
        # Run the showquota command
        result = subprocess.check_output("/sw/local/bin/showquota", shell=True, stderr=subprocess.STDOUT)
        output = result.decode("utf-8").strip()

        # Parse the output
        lines = output.split("\n")
        if len(lines) < 2:
            return jsonify({"error": "Unexpected output format from showquota"}), 500

        # Skip the header line and process the rest
        quotas = []
        for line in lines[2:]:
            parts = line.split()
            if len(parts) < 5:  # Ensure the line has enough parts to parse
                continue
            quotas.append({
                "disk": parts[0],
                "disk_usage": parts[1],
                "disk_limit": parts[2],
                "file_usage": parts[3],
                "file_limit": parts[4],
                "additional_info": " ".join(parts[5:]) if len(parts) > 5 else "",
            })

        return jsonify({"quotas": quotas}), 200
    except subprocess.CalledProcessError as e:
        error_message = e.output.decode("utf-8")
        return jsonify({"error": f"Command failed: {error_message}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/groups', methods=['GET'])
def get_user_groups():
    try:
        # Run the `groups` command to fetch groups for the current user
        result = subprocess.check_output("groups", shell=True, stderr=subprocess.STDOUT)
        output = result.decode("utf-8").strip()

        # Parse the groups into a list
        groups = output.split()

        return jsonify({"groups": groups}), 200
    except subprocess.CalledProcessError as e:
        error_message = e.output.decode("utf-8")
        return jsonify({"error": f"Command failed: {error_message}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/cpuavail', methods=['GET'])
def get_cpuavail():
    try:
        # Run the `cpuavail` command
        result = subprocess.check_output("/sw/local/bin/cpuavail", shell=True, stderr=subprocess.STDOUT)
        output = result.decode("utf-8").strip()

        # Debug: Log raw output
        print("Raw output from cpuavail:\n", output)

        # Parse the output
        lines = output.split("\n")
        config_start = next((i for i, line in enumerate(lines) if "CONFIGURATION" in line), -1)
        avail_start = next((i for i, line in enumerate(lines) if "AVAILABILITY" in line), -1)

        if config_start == -1 or avail_start == -1:
            return jsonify({"error": "Unexpected output format from cpuavail"}), 500

        # Parse configuration section
        config_data = []
        for line in lines[config_start + 3 : avail_start - 1]:
            parts = line.split()
            if len(parts) == 2:
                config_data.append({
                    "node_type": parts[0],
                    "node_count": int(parts[1]),
                })

        # Parse availability section
        availability_data = []
        for line in lines[avail_start + 3 :]:
            parts = line.split()
            if len(parts) == 3:
                availability_data.append({
                    "node_name": parts[0],
                    "cpus_available": int(parts[1]),
                    "memory_available": int(parts[2]),
                })

        return jsonify({
            "configuration": config_data,
            "availability": availability_data,
        }), 200
    except subprocess.CalledProcessError as e:
        error_message = e.output.decode("utf-8")
        print(f"Command failed with error: {error_message}")
        return jsonify({"error": f"Command failed: {error_message}"}), 500
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api.route('/get_env', methods=['GET'])
def get_envs():
    envs = str(os.environ)
    scratch = os.path.expandvars("/scratch/user/$USER")
    virtual_envs = "virtual_envs/metadata.json"
    metadataPath = os.path.join(scratch, virtual_envs)
    try:
        # Check if the metadata file exists first, rather than catching in an exception. It is a common case; exceptions should be used for unexpected edge cases, hence the name
        if not os.path.exists(metadataPath):
            return jsonify({"error": f"There was no metadata file found; user likely has not yet used 'create_venv' to make a virtual environment", "code": f"NO_METADATA"}), 500
        with open(metadataPath,'r') as file:
            metadata = json.load(file)  
            return metadata, 200
    except json.JSONDecodeError as e:
        return jsonify({"error": f"The metadata file is corrupted or not in JSON format: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error while fetching user's venvs: {str(e)}"}), 500

@api.route('/delete_env/<envToDelete>', methods=['DELETE'])
def delete_env(envToDelete):
    try:
        if "SCRATCH" not in os.environ:
            os.environ["SCRATCH"] = os.path.expandvars("/scratch/user/$USER")
        script = f"/sw/local/bin/delete_venv"
        result = subprocess.run([script, envToDelete], stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')
        if result.returncode != 0:
            raise RuntimeError(f"Error deleting environment: {result.stdout.strip()}")
        return jsonify({"message": result.stdout.strip()}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"delete_venv script failed with error: {e.stdout.strip()}"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error deleting the environment: {str(e)}"}), 500

@api.route('/get_py_versions', methods=['GET'])
def get_py_versions():
    try:
        captureCommand = "/sw/local/bin/toolchains | grep Python > captured-output.txt"
        removeCommand = "rm captured-output.txt"
        subprocess.run(captureCommand, shell=True)
        versions = {}
        with open("captured-output.txt", "r") as file:
            next(file)
            # Grabbing the Python version and mapping it to corresponding GCC version
            for line in file:
                words = line.split()
                if words[6] in versions:
                    break
                else:
                    versions[words[6]] = words[2]
        subprocess.run(removeCommand, shell=True)
        return jsonify(versions), 200
    except FileNotFoundError as e:
        return jsonify({"error": "There was a file error while getting the Python versions; 'captured-output.txt' file was not found"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error while fetching Python versions: {str(e)}"}), 500

@api.route('create_venv', methods=['POST'])
def create_venv():
    try:
        data = request.json
        envName = data.get('envName')
        description = data.get('description')
        pyVersion = data.get('pyVersion')
        gccversion = data.get('GCCversion')
        
        if not envName or not gccversion or not pyVersion:
            return jsonify({"error": "Missing required parameters from the form submission"}), 400
    
        # When running commands on the flask server machine for this app, you will need to source /etc/profile before using ml/module load
        createVenvCommand = f"source /etc/profile && module load {gccversion} {pyVersion} && /sw/local/bin/create_venv {envName} -d '{description}'"
        
        result = subprocess.run(createVenvCommand, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')
        if result.returncode != 0:
            return jsonify({"error": f"There was an error while creating the virtual environment: {result.stdout}"}), 500
        return jsonify({"message": f"{envName} was successfully created!"}), 200
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error while creating a new venv: {str(e)}"}), 500
        
@api.route('/projectinfo', methods=['GET'])
def get_projectinfo():
    """Retrieve project information and allow querying for job history or pending jobs."""
    try:
        account = request.args.get("account")  # Account number for filtering
        job_history = request.args.get("job_history")  # Boolean flag for job history
        pending_jobs = request.args.get("pending_jobs")  # Boolean flag for pending jobs

        if pending_jobs and account:
            command = f"/sw/local/bin/myproject -p {account}"
        elif job_history and account:
            command = f"/sw/local/bin/myproject -j {account}"
        else:
            command = "/sw/local/bin/myproject"

        # Log and print the executed command
        logging.info(f"Executing command: {command}")
        print(f"Executing command: {command}")

        # Run the command and capture output
        result = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT)
        output = result.decode("utf-8").strip()

        # Log and print the raw output
        logging.info(f"Raw output from myproject:\n{output}")
        print(f"Raw output from myproject:\n{output}")

        # Include the executed command and raw output in the response
        response_data = {
            "executed_command": command,
            "raw_output": output
        }

        # If querying pending jobs
        if pending_jobs and account:
            response_data["pending_jobs"] = parse_pending_jobs(output)
            return jsonify(response_data), 200

        # If querying job history
        if job_history and account:
            response_data["job_history"] = parse_job_history(output)
            return jsonify(response_data), 200

        # Otherwise, parse project accounts (default behavior)
        response_data["projects"] = parse_project_accounts(output)
        return jsonify(response_data), 200

    except subprocess.CalledProcessError as e:
        error_message = e.output.decode("utf-8")
        logging.error(f"Command failed: {error_message}")
        return jsonify({"error": f"Command failed: {error_message}"}), 500
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def parse_project_accounts(output):
    """Parses output from `myproject` to extract project account details."""
    lines = output.split("\n")
    start_index = next((i for i, line in enumerate(lines) if "|  Account" in line), -1)
    
    if start_index == -1 or len(lines) <= start_index + 2:
        return {"error": "Unexpected output format from myproject"}

    project_data = []
    for line in lines[start_index + 2:]:
        if line.strip().startswith("|"):
            fields = [field.strip() for field in line.split("|")[1:-1]]
            if len(fields) == 7:  # Ensure correct number of fields
                project_data.append({
                    "account": fields[0],
                    "fy": fields[1],
                    "default": fields[2],
                    "allocation": float(fields[3]) if fields[3].replace('.', '', 1).isdigit() else 0.0,
                    "used_pending_sus": float(fields[4]) if fields[4].replace('.', '', 1).isdigit() else 0.0,
                    "balance": float(fields[5]) if fields[5].replace('.', '', 1).isdigit() else 0.0,
                    "pi": fields[6],
                })

    return {"projects": project_data}


def parse_pending_jobs(output):
    """Parses output from `myproject -p <account>` to extract pending jobs."""
    lines = output.split("\n")
    job_data = []

    for line in lines[2:]:  # Skip header lines
        if line.strip().startswith("|") and len(line.split("|")) >= 6:
            fields = [field.strip() for field in line.split("|")[1:-1]]
            if len(fields) == 5:  # Ensure correct number of fields
                job_data.append({
                    "job_id": fields[0],
                    "state": fields[1],
                    "cores": fields[2],
                    "effective_cores": fields[3],
                    "walltime_hours": fields[4],
                })

    return {"pending_jobs": job_data}


def parse_job_history(output):
    """Parses output from `myproject -j <account>` to extract job history."""
    lines = output.split("\n")

    # Log raw lines for debugging
    logging.info(f"Parsing job history, raw lines: {lines[:10]}")  # Only show the first 10 lines
    print(f"Parsing job history, raw lines: {lines[:10]}")

    history_data = []

    # Find the start of the data table
    start_index = next((i for i, line in enumerate(lines) if "JobID" in line and "SubmitTime" in line), -1)
    
    if start_index == -1 or len(lines) <= start_index + 1:
        return {"error": "Unexpected output format from myproject"}

    # Parse jobs from the output
    for line in lines[start_index + 1:]:
        fields = [field.strip() for field in line.split("|") if field.strip()]
        if len(fields) >= 8:  # Ensure correct number of fields
            history_data.append({
                "job_id": fields[1],  # Job ID is the second column
                "submit_time": fields[3],
                "start_time": fields[4],
                "end_time": fields[5],
                "walltime": fields[6],
                "total_slots": fields[7],
                "used_sus": fields[8],
            })

    return {"job_history": history_data}

@api.route('/set_default_account', methods=['POST'])
def set_default_account():
    """
    Set a new default account using 'myproject -d <accountNo>'.
    """
    try:
        data = request.json
        account_no = data.get("account_no")

        if not account_no:
            return jsonify({"error": "Missing account number"}), 400

        command = f"/sw/local/bin/myproject -d {account_no}"
        
        # Log command execution
        logging.info(f"Setting default account with command: {command}")
        print(f"Executing command: {command}")

        # Execute the command
        result = subprocess.run(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip()
            logging.error(f"Error setting default account: {error_msg}")
            return jsonify({"error": f"Failed to set default account: {error_msg}"}), 500

        # Return success response
        return jsonify({"message": f"Default account set to {account_no} successfully"}), 200

    except Exception as e:
        logging.error(f"Unexpected error setting default account: {str(e)}")
        return jsonify({"error": str(e)}), 500

def run_command(command):
    """
    Execute a shell command using subprocess and return the output.
    """
    try:
        logging.info(f"Executing command: {command}")
        result = subprocess.run(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip()
            logging.error(f"Command failed: {error_msg}")
            raise RuntimeError(error_msg)

        return result.stdout.strip()
    except Exception as e:
        logging.error(f"Unexpected error executing command: {str(e)}")
        raise RuntimeError(str(e))


# API to fetch jobs for the current user ($USER)
@api.route("/jobs", methods=["GET"])
def get_user_jobs():
    try:
        result = subprocess.run(
            ["squeue", "-u", os.getenv("USER"), "--format=%i %t %D"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8"
        )

        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip())

        jobs = []
        lines = result.stdout.strip().split("\n")[1:]  # Skip header
        for line in lines:
            parts = line.split()
            if len(parts) == 3:
                jobs.append({
                    "job_id": parts[0],
                    "state": parts[1],
                    "nodes": parts[2],
                })

        return jsonify({"jobs": jobs}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API to cancel a job
@api.route("/cancel_job/<job_id>", methods=["DELETE"])
def cancel_job(job_id):
    try:
        result = subprocess.run(
            ["scancel", job_id],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8"
        )

        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip())

        return jsonify({"message": f"Job {job_id} canceled successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route("/utilization", methods=["GET"])
def get_utilization():
    try:
        # Fetch Node Data
        allocated_nodes = int(subprocess.check_output("/sw/local/bin/pestat -s alloc | tail -n+4 | wc -l", shell=True).decode("utf-8").strip())
        mixed_nodes = int(subprocess.check_output("/sw/local/bin/pestat -s mix | tail -n+4 | wc -l", shell=True).decode("utf-8").strip())
        idle_nodes = int(subprocess.check_output("/sw/local/bin/pestat -s idle | tail -n+4 | wc -l", shell=True).decode("utf-8").strip())

        # Fetch Core Data
        allocated_cpus = int(subprocess.check_output("/sw/local/bin/pestat -s alloc,mix,idle | tail -n+4 | awk '{print $4}' | awk 'NR>3' | awk '{s+=$1} END {printf \"%.0f\", s}'", shell=True).decode("utf-8").strip())
        total_cpus = int(subprocess.check_output("/sw/local/bin/pestat -s alloc,mix,idle | tail -n+4 | awk '{print $5}' | awk 'NR>3' | awk '{s+=$1} END {printf \"%.0f\", s}'", shell=True).decode("utf-8").strip())
        idle_cpus = total_cpus - allocated_cpus

        # Fetch Job Data
        running_jobs = int(subprocess.check_output("/usr/bin/squeue --noheader --states=RUNNING | wc -l", shell=True).decode("utf-8").strip())
        pending_jobs = int(subprocess.check_output("/usr/bin/squeue --noheader --states=PENDING | wc -l", shell=True).decode("utf-8").strip())

        utilization_data = {
            "nodes": {
                "allocated": allocated_nodes,
                "mixed": mixed_nodes,
                "idle": idle_nodes
            },
            "cores": {
                "allocated": allocated_cpus,
                "idle": idle_cpus
            },
            "jobs": {
                "running": running_jobs,
                "pending": pending_jobs
            }
        }

        return jsonify(utilization_data), 200

    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Command failed: {e.output.decode('utf-8')}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    try:
        data = request.json
        envName = data.get('envName')
        description = data.get('description')
        pyVersion = data.get('pyVersion')
        gccversion = data.get('GCCversion')
        
        if not envName or not gccversion or not pyVersion:
            return jsonify({"error": "Missing required parameters from the form submission"}), 400
    
        # When running commands on the flask server machine for this app, you will need to source /etc/profile before using ml/module load
        createVenvCommand = f"source /etc/profile && module load {gccversion} {pyVersion} && /sw/local/bin/create_venv {envName} -d '{description}'"
        
        result = subprocess.run(createVenvCommand, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')
        if result.returncode != 0:
            return jsonify({"error": f"There was an error while creating the virtual environment: {result.stdout}"}), 500
        return jsonify({"message": f"{envName} was successfully created!"}), 200
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error while creating a new venv: {str(e)}"}), 500

@api.route('/delete_layout', methods=['DELETE'])
def delete_layout():
    """Delete a saved layout"""
    try:
        layout_name = request.json.get("layout_name")
        if not layout_name:
            return jsonify({"error": "Missing layout name"}), 400

        layouts_dir = f"/scratch/user/{user}/ondemand/layouts"
        layout_file_path = os.path.join(layouts_dir, f"{layout_name}.json")

        if not os.path.exists(layout_file_path):
            return jsonify({"error": f"Layout {layout_name} does not exist"}), 404

        os.remove(layout_file_path)
        return jsonify({"message": f"Layout {layout_name} deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/rename_layout', methods=['POST'])
def rename_layout():
    """Rename a saved layout"""
    try:
        data = request.json
        old_name = data.get("old_name")
        new_name = data.get("new_name")

        if not old_name or not new_name:
            return jsonify({"error": "Missing old or new layout name"}), 400

        layouts_dir = f"/scratch/user/{user}/ondemand/layouts"
        old_path = os.path.join(layouts_dir, f"{old_name}.json")
        new_path = os.path.join(layouts_dir, f"{new_name}.json")

        if not os.path.exists(old_path):
            return jsonify({"error": f"Layout {old_name} does not exist"}), 404

        if os.path.exists(new_path):
            return jsonify({"error": f"A layout named {new_name} already exists"}), 400

        os.rename(old_path, new_path)
        return jsonify({"message": f"Layout {old_name} renamed to {new_name} successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500