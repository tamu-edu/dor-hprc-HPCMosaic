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

import datetime
import requests

import yaml

# Get the path to the config file
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
config_path = os.path.join(base_dir, 'config.yml')

# Load the YAML file
with open(config_path, 'r') as file:
    config_data = yaml.safe_load(file)

# Get the production settings
production = config_data.get('development', {})

def get_group_directory_info(group_name):
    directory_path = f"/scratch/group/{group_name}"
    owner = None

    try:
        result = subprocess.check_output(['ls', '-la', '/scratch/group/'], encoding='utf-8')
        lines = result.strip().split('\n')

        for line in lines:
            if group_name in line:
                logging.info(f"Matched line for group '{group_name}': {line}")
                parts = line.split()
                if len(parts) >= 3:
                    owner = parts[2]  # third field is the owner
                    logging.info(f"Inferred group owner: {owner}")

                # Check for symlink
                if '->' in line:
                    target_path = line.split('->')[-1].strip()
                    directory_path = target_path if target_path.startswith('/') else f"/scratch/group/{target_path}"
                    logging.info(f"Resolved symlink path: {directory_path}")
                break
        else:
            logging.warning(f"No match found for group '{group_name}' in /scratch/group/")
    except subprocess.CalledProcessError as e:
        logging.error(f"Error fetching group directory info for {group_name}: {e}")

    return {
        "directory": directory_path,
        "owner": owner
    }

def get_user_email(username):
    """
    Convert local userid to real institutional email using mapping file
    Format: u.username:real_email:first_name:last_name
    """

    try:
        mapping_file = "/usr/local/etc/email_mapping.access.login"
        
        if os.path.exists(mapping_file):
            with open(mapping_file, 'r') as f:
                for line in f:
                    line = line.strip()

                    if line and not line.startswith('#'):
                        parts = line.split(':')

                        if len(parts) >= 4: #To ensure all four fields
                            local_user = parts[0].strip()
                            real_email = parts[1].strip()
                            first_name = parts[2].strip()
                            last_name = parts[3].strip()

                            if local_user == username:
                                print(f"Found email mapping: {username} -> {real_email}")
                                return real_email
        print(f"Warning: No email mapping found for {username}")
        return f"{username}@tamu.edu"
    except Exception as e:
        print(f"Error reading email mapping: {e}")
        return f"{username}@tamu.edu"

def clean_number(value):
    """
    Strips non-numeric characters (like 'TB', 'GB', etc.) and converts to float.
    Returns None if input is None or invalid.
    """
    if value:
        try:
            return float(re.sub(r"[^\d.]+", "", value))
        except ValueError:
            return None
    return None

# Create variables for easy access
cluster_name = production.get('cluster_name')
dashboard_url = production.get('dashboard_url')
request_email = production.get('request_email')
help_email = production.get('help_email')
hprcbot_route = production.get('hprcbot_route')

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
        output_file = "/tmp/captured-output.txt"
        captureCommand = f"/sw/local/bin/toolchains | grep Python > {output_file}"
        removeCommand = f"rm {output_file}"
        subprocess.run(captureCommand, shell=True)
        versions = {}
        with open("/tmp/captured-output.txt", "r") as file:
            next(file)
            # Grabbing the Python version and mapping it to corresponding GCC version
        #    return jsonify({"error": str(e), "debug": "hi"}), 500
            for line in file:
                words = line.split()
                if len(words) < 7:
                    continue
                py_version = words[6]
                if py_version not in versions:
                    versions[py_version] = words[2]
        subprocess.run(removeCommand, shell=True)
        return jsonify(versions), 200
    except FileNotFoundError as e:
        return jsonify({"error": "There was a file error while getting the Python versions; 'captured-output.txt' file was"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error while fetching Python versions: {str(e)}"}), 500
@api.route('/create_venv', methods=['POST'])
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
        #createVenvCommand = f"ssh alogin2 source /etc/profile && module load {gccversion} {pyVersion} && /sw/local/bin/create_venv {envName} -d '{descriptio
        createVenvCommand = (
                f"ssh alogin2 'bash -l -c \"source /etc/profile && "
                f"module load {gccversion} {pyVersion} && "
                f"/sw/local/bin/create_venv {envName} -d \\\"{description}\\\"\"'"
        )
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
    
def parse_scontrol_output(output):
    """Parses output from `scontrol show job <jobid>` to extract job details."""
    job_info = {}

    # Flatten all lines into space-separated tokens
    tokens = []
    for line in output.split("\n"):
        line = line.strip()
        if line:
            tokens.extend(line.split())

    # Map scontrol keys to our desired dictionary keys
    key_map = {
        "JobId": "job_id",
        "JobName": "job_name",
        "UserId": "user_group",
        "Account": "user_account",
        "JobState": "state",
        "Reason": "reason",
        "ExitCode": "exit_code",
        "RunTime": "time_elapsed",
        "TimeLimit": "time_requested",
        "StartTime": "start_time",
        "EndTime": "end_time",
        "Partition": "partition",
        "NodeList": "nodelist",
        "NumNodes": "node_count",
        "NumCPUs": "cores",
        "NumTasks": "task_count",
        "Command": "submit_line",
        "WorkDir": "submit_dir",
    }

    for token in tokens:
        if "=" in token:
            key, value = token.split("=", 1)
            if key in key_map:
                job_info[key_map[key]] = value

    return {"job_details": job_info}

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
        jobs = []
        
        #get active jobs (squeue)
        result = subprocess.run(
            ["squeue", "-u", os.getenv("USER"), "--format=%i %t %D"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8"
        )
        lines = result.stdout.strip().split("\n")[1:]
        
        for line in lines:
            parts = line.split()
            if len(parts) == 3:
                job_id, state, nodes = parts
                
                #running 'scontrol show job <jobid>' to get a single job info
                myjob_command = subprocess.run(
                    ["scontrol", "show", "job", job_id], 
                    stdout = subprocess.PIPE, 
                    stderr = subprocess.PIPE,
                    encoding="utf-8",
                ).stdout
                job_details_parsed = parse_scontrol_output(myjob_command)["job_details"]
        
                jobs.append({
                    "job_id": job_id,
                    "job_name": job_details_parsed.get("job_name"),
                    "state": state,
                    "cpus": job_details_parsed.get("cores"),
                    "nodes": nodes,
                    "time_requested": job_details_parsed.get("time_requested"),
                    "time_elapsed": job_details_parsed.get("time_elapsed"),
                    "submit_dir": job_details_parsed.get("submit_dir"),
                })
            
        return jsonify({ "jobs": jobs }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API to cancel a job
@api.route("/cancel_job/<job_id>", methods=["POST"])
@api.route("/cancel_job/<job_id>/", methods=["POST"])
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

@api.route('/delete_layout', methods=['DELETE'])
def delete_layout():
    """Delete a saved layout"""
    try:
        layout_name = request.json.get("layout_name")
        if not layout_name:
            return jsonify({"error": "Missing layout name"}), 400

        user = os.getenv("USER", "default_user")  # Fallback to 'default_user' if USER is not set

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

        user = os.getenv("USER", "default_user")  # Fallback to 'default_user' if USER is not set

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

@api.route('/quota', methods=['POST'])
def request_quota():
    try:
        # Extract form data
        directory = request.form.get('directory')
        current_quota = request.form.get('currentQuota')
        current_file_limit = request.form.get('currentFileLimit')
        new_quota = request.form.get('newQuota')
        new_file_limit = request.form.get('newFileLimit')
        request_type = request.form.get('requestType')
        pi_awareness = request.form.get('piAwareness')
        stored_data = request.form.get('storedData')
        research_description = request.form.get('researchDescription')
        job_size = request.form.get('jobSize')
        storage_plan = request.form.get('storagePlan')
        comment = request.form.get('comment', '')
        is_long_request = request.form.get('isLongRequest')
        is_pi_request = request.form.get('isPIRequest')
        is_buy_request = request.form.get('isBuyRequest')
        expiration_date = request.form.get('expiration', '')
        account_number = request.form.get('account', '')

        user = os.environ.get('USER', 'unknown')
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        subject = f"[{cluster_name}] Quota Request: {user}"

        if is_buy_request == 'Yes':
            body = f"""
Cluster: {cluster_name}
User: {user}
DiskName: {directory}
Request Type: Buy-in Quota Request
Expiration Date: {expiration_date}
Account Number: {account_number}

--- CURRENT QUOTA ---
Current disk space: {current_quota}
Current file limit: {current_file_limit}

--- REQUESTING QUOTA ---
Requesting disk space: {new_quota}TB
Requesting file limit: {new_file_limit}

Comment: {comment}
"""
        else:
            body = f"""
Cluster: {cluster_name}
User: {user}
DiskName: {directory}
Request Type: {request_type}

--- CURRENT QUOTA ---
Current disk space: {current_quota}
Current file limit: {current_file_limit}

--- REQUESTING QUOTA ---
Requesting disk space: {new_quota}TB
Requesting file limit: {new_file_limit}

--- Justification ---
Is the PI aware of this request?
{pi_awareness}

What data is stored with the requested quota?
{stored_data}

Briefly describe the research project that will be supported by the requested storage?
{research_description}

What is the input/output size of the job?
{job_size}

What is your long-term storage plan for your data after the quota increase expires?
{storage_plan}

Comment: {comment}
"""

        # First attempt: send to HPRC Bot
        try:
            combined_justification = f"""
Is the PI aware of this request?
{pi_awareness}

What data is stored with the requested quota?
{stored_data}

Briefly describe the research project that will be supported by the requested storage?
{research_description}

What is the input/output size of the job?
{job_size}

What is your long-term storage plan for your data after the quota increase expires?
{storage_plan}
"""

            try:
                formatted_current_quota = clean_number(current_quota)
                formatted_current_file_limit = int(re.sub(r"[^\d]", "", current_file_limit)) if current_file_limit else None
                formatted_new_quota = clean_number(new_quota)
                formatted_new_file_limit = int(re.sub(r"[^\d]", "", new_file_limit)) if new_file_limit else None
                has_previous = request_type == 'Extension'
            except ValueError as ve:
                logging.warning(f"Failed to convert quota fields: {ve}")
                formatted_current_quota = current_quota
                formatted_current_file_limit = current_file_limit
                formatted_new_quota = new_quota
                formatted_new_file_limit = new_file_limit
                has_previous = request_type == 'Extension'

            buyin_status = 'yes' if is_buy_request == 'Yes' else 'no'
            params = {
                'request_type': 'Quota',
                'user': user,
                'directory': directory,
                'current_quota': formatted_current_quota,
                'current_file_limit': formatted_current_file_limit,
                'desired_disk': formatted_new_quota,
                'total_file_limit': formatted_new_file_limit,
                'request_justification': combined_justification,
                'comment': comment,
                'cluster_name': cluster_name,
                'confirmBuyin': buyin_status,
                'has_previous': has_previous,
                'request_until': expiration_date,
                'account_number': account_number if buyin_status == 'yes' else '',
                'email': get_user_email(user)
            }

            logging.info(f"Sending quota request to HPRC Bot at {hprcbot_route}")
            response = requests.post(f"{hprcbot_route}/HPRCapp/OOD", json=params, timeout=5)

            if response.status_code == 200 or response.text == "OK":
                return jsonify({
                    "message": f"Your quota request has been submitted successfully via HPRC Bot.",
                    "status": "bot_success"
                }), 200
            else:
                print(f"HPRC Bot returned: {response.text}")
                raise Exception(f"HPRC Bot returned: {response.text}")

        except Exception as bot_error:
            print(f"HPRC Bot submission failed: {bot_error}")
            logging.warning(f"HPRC Bot submission failed: {bot_error}")

        # Fallback: Send Email
        try:
            import smtplib
            from email.mime.text import MIMEText

            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = get_user_email(user)
            msg['To'] = request_email

            smtp_server = "smtp.tamu.edu"
            smtp_port = 25

            with smtplib.SMTP(smtp_server, smtp_port) as server:
                response = server.send_message(msg)

                if not response:
                    return jsonify({
                        "message": "Your quota request has been submitted successfully via email.",
                        "status": "email_success"
                    }), 200
                else:
                    return jsonify({
                        "message": "Quota request logged, but some email issues occurred.",
                        "status": "email_partial",
                        "details": str(response)
                    }), 200

        except Exception as email_error:
            logging.error(f"Email fallback failed: {email_error}")
            return jsonify({
                "message": f"Your quota request was logged, but we couldn't email support. Please contact {help_email}.",
                "status": "email_failed",
                "error": str(email_error)
            }), 202

    except Exception as e:
        logging.error(f"Quota request processing failed: {e}")
        return jsonify({
            "error": f"Failed to process quota request: {str(e)}. Please contact {help_email}.",
            "status": "failed"
        }), 500

@api.route('/group', methods=['POST'])
def request_group():
    try:
        def split_netids(input_str):
            return [line.strip() for line in input_str.strip().splitlines() if line.strip()]

        # Extract form data
        group_request_type = request.form.get('groupRequest')
        group_name = request.form.get('groupName')
        group_members = request.form.get('groupMembers', '')
        group_add = request.form.get('groupAdd', '')
        group_remove = request.form.get('groupRemove', '')
        comments = request.form.get('comments', '')

        user = os.environ.get('USER', 'unknown')
        email = get_user_email(user)

        logging.info(f"Group request received from {user}, type: {group_request_type}")

        params = {
            'request_type': 'Group',
            'user': user,
            'email': email,
            'cluster_name': cluster_name,
            'comments': comments,
            'new_group': group_request_type == 'cgroup'
        }

        # Inject group_name into path and fetch owner if available
        if group_name and group_name.strip():
            group_name = group_name.strip()
            dir_info = get_group_directory_info(group_name)
            logging.info(f"Group directory: {dir_info['directory']}")

            params['group_name'] = group_name
            params['directory'] = dir_info['directory']

        if group_request_type == 'cgroup':
            params['action'] = 'createGroup'
            params['Add'] = 'createGroup'
            params['target_users'] = split_netids(group_members)
        elif group_request_type == 'madd':
            params['action'] = 'addMembers'
            params['Add'] = 'addMembers'
            params['target_users'] = split_netids(group_add)
        elif group_request_type == 'mremove':
            params['action'] = 'deleteMembers'
            params['Add'] = 'deleteMembers'
            params['target_users'] = split_netids(group_remove)
        elif group_request_type == 'rgroup':
            params['action'] = 'requestAccess'
            params['Add'] = 'requestAccess'

        else:
            return jsonify({"error": f"Unknown group request type: {group_request_type}"}), 400

        logging.info(f"Sending to HPRC Bot: {params}")

        hprcbot_url = hprcbot_route
        response = requests.post(f"{hprcbot_url}/HPRCapp/OOD", json=params, timeout=15)

        if response.status_code == 200:
            logging.info("Group request successfully submitted to HPRC Bot")
            return jsonify({
                "message": "Your group request has been submitted successfully.",
                "status": "bot_success"
            }), 200
        else:
            logging.warning(f"HPRC Bot returned {response.status_code}: {response.text}")
            raise Exception(f"HPRC Bot returned non-200 response")

    except Exception as e:
        logging.error(f"Error processing group request: {str(e)}")
        return jsonify({
            "error": f"Failed to process your group request: {str(e)}. Please contact {help_email}.",
            "status": "failed"
        }), 500

@api.route('/help', methods=['POST'])
def request_help():
    try:
        logging.info("🔥 HELP REQUEST RECEIVED 🔥")
        user = os.environ.get('USER', 'unknown')
        email = get_user_email(user)

        # Raw form fields
        help_request_type = request.form.get("helpRequest", "").strip()

        logging.info(f"Received help request type: {help_request_type} from {user}")

        # Initialize shared fields
        params = {
            "request_type": "Help",
            "user": user,
            "email": get_user_email(user),
            "cluster_name": cluster_name,
            "help_topic": help_request_type,
            "issue_description": "",
            "error_message": "",
            "job_file_path": "",
            "job_id": "",
            "program_file_path": "",
            "additional_information": ""
        }

        # Software Help
        if help_request_type == "software":
            software_name = request.form.get("softwareName", "")
            software_version = request.form.get("softwareVersion", "")
            software_toolchain = request.form.get("softwareToolChain", "")
            software_link = request.form.get("softwareLink", "")
            software_info = request.form.get("softwareInfo", "")
            params["issue_description"] = f"{software_name} (v{software_version}) - Toolchain: {software_toolchain}"
            params["program_file_path"] = software_link
            params["additional_information"] = software_info

        # Job Help
        elif help_request_type == "jobs":
            params["job_id"] = request.form.get("jobID", "")
            params["job_file_path"] = request.form.get("jobLocation", "")
            params["issue_description"] = request.form.get("jobIssue", "")
            params["error_message"] = request.form.get("jobErrors", "")

        # Account Help
        elif help_request_type == "accounts":
            account_type = request.form.get("accountType", "")
            if account_type == "general":
                params["issue_description"] = request.form.get("jobIssue", "")
            elif account_type == "addAccount":
                acct = request.form.get("accountNumber", "")
                user_to_add = request.form.get("accountUser", "")
                params["issue_description"] = f"Add user {user_to_add} to account {acct}."
            elif account_type == "transferSU":
                acct = request.form.get("accountNumber", "")
                target_user = request.form.get("accountUser", "")
                sus = request.form.get("jobIssue", "")
                params["issue_description"] = f"Transfer {sus} SUs from account {acct} to {target_user}."

        # Other Help
        elif help_request_type == "other":
            params["issue_description"] = request.form.get("otherDescription", "")

        logging.info(f"Sending Help request to HPRC Bot: {params}")

        response = requests.post(f"{hprcbot_route}/HPRCapp/OOD", json=params, timeout=15)

        if response.status_code == 200:
            logging.info("Help request successfully submitted to HPRC Bot")
            return jsonify({
                "message": "Your help request has been submitted successfully.",
                "status": "bot_success"
            }), 200
        else:
            logging.warning(f"HPRC Bot returned {response.status_code}: {response.text}")
            raise Exception(f"HPRC Bot returned non-200 response")

    except Exception as e:
        logging.error(f"Error processing help request: {str(e)}")
        return jsonify({
            "error": f"Failed to process your help request: {str(e)}. Please contact {help_email}.",
            "status": "failed"
        }), 500

@api.route('/software', methods=['POST'])
def request_software():
    try:
        logging.info("🧪 SOFTWARE REQUEST RECEIVED 🧪")
        user = os.environ.get('USER', 'unknown')
        email = get_user_email(user)

        software_name = request.form.get("softwareName", "").strip()
        software_version = request.form.get("softwareVersion", "").strip()
        software_link = request.form.get("softwareLink", "").strip()
        software_toolchain = request.form.get("softwareToolChain", "").strip()
        software_info = request.form.get("softwareInfo", "").strip()
        software_category = request.form.get("softwareCategory", "").strip()

        if not software_name:
            raise ValueError("Software name is required.")

        params = {
            "request_type": "Software",
            "user": user,
            "email": email,
            "cluster_name": cluster_name,
            "software_name": software_name,
            "software_version": software_version,
            "software_link": software_link,
            "toolchains": software_toolchain,
            "request_justification": f"Category: {software_category}\n{software_info}",
            "additional_notes": ""
        }

        logging.info(f"Sending software request to HPRC Bot: {params}")

        response = requests.post(f"{hprcbot_route}/HPRCapp/OOD", json=params, timeout=15)

        if response.status_code == 200:
            logging.info("Software request successfully submitted to HPRC Bot")
            return jsonify({
                "message": "Your software request has been submitted successfully.",
                "status": "bot_success"
            }), 200
        else:
            logging.warning(f"HPRC Bot returned {response.status_code}: {response.text}")
            raise Exception(f"HPRC Bot returned non-200 response")

    except Exception as e:
        logging.error(f"Error processing software request: {str(e)}")
        return jsonify({
            "error": f"Failed to process your software request: {str(e)}. Please contact {help_email}.",
            "status": "failed"
        }), 500

@api.route('/account', methods=['POST'])
def request_account_purchase():
    try:
        logging.info("🧾 ACCOUNT PURCHASE REQUEST RECEIVED 🧾")
        user = os.environ.get('USER', 'unknown')
        email = get_user_email(user)

        what = request.form.get("purchaseWhat", "").strip()
        who = request.form.get("purchaseWho", "").strip()
        due_raw = request.form.get("purchaseDue", "").strip()
        accounts_raw = request.form.get("purchaseAccounts", "").strip()
        notes = request.form.get("purchaseNotes", "").strip()

        try:
            due = datetime.strptime(due_raw, "%Y-%m-%d") if due_raw else None
        except ValueError:
            due = None

        accounts = [acct.strip() for acct in accounts_raw.split(",") if acct.strip()]

        params = {
            "request_type": "Purchase",
            "user": user,
            "email": email,
            "cluster_name": cluster_name,
            "what": what,
            "who": who,
            "due": due.isoformat() if due else "",
            "accounts": accounts,
            "additional_notes": notes
        }

        logging.info(f"Sending account purchase request to HPRC Bot: {params}")
        response = requests.post(f"{hprcbot_route}/HPRCapp/OOD", json=params, timeout=15)

        if response.status_code == 200:
            logging.info("Account request successfully submitted to HPRC Bot")
            return jsonify({
                "message": "Your account purchase request has been submitted successfully.",
                "status": "bot_success"
            }), 200
        else:
            raise Exception(f"HPRC Bot returned non-200: {response.status_code}")

    except Exception as e:
        logging.error(f"Error processing account request: {str(e)}")
        return jsonify({
            "error": f"Failed to process your account purchase request: {str(e)}",
            "status": "failed"
        }), 500