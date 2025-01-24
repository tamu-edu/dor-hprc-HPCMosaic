from flask import Blueprint, request, jsonify
import json
from sys import version as python_formatted_version
import os
from collections import OrderedDict
import subprocess

api = Blueprint('api', __name__)

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
        layouts_dir = f"/scratch/user/{user}/layouts"
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
        layouts_dir = f"/scratch/user/{user}/layouts"
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
        layouts_dir = f"/scratch/user/{user}/layouts"
        layout_file_path = os.path.join(layouts_dir, f"{layout_name}.json")

        if not os.path.exists(layout_file_path):
            return jsonify({"error": f"Layout {layout_name} does not exist"}), 404

        # Load the layout data
        with open(layout_file_path, 'r') as f:
            layout_data = json.load(f)

        return jsonify({"layout_name": layout_name, "layout_data": layout_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/get_env', methods=['GET'])
def get_envs():
    envs = str(os.environ)
    scratch = os.path.expandvars("/scratch/user/$USER")
    virtual_envs = "virtual_envs/metadata.json"
    metadataPath = os.path.join(scratch, virtual_envs)
    try:
        with open(metadataPath,'r') as file:
            metadata = json.load(file)  
            return metadata, 200
    except FileNotFoundError as e:
        return jsonify({"error": f"There was no metadata file found; you likely have not yet used 'create_venv' to make a virtual environment: {str(e)}"}), 500
    except json.JSONDecodeError as e:
        return jsonify({"error": f"The metadata file is corrupted or not in JSON format: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error: {str(e)}"}), 500

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
        return jsonify({"error": f"Script failed with error: {e.stdout.strip()}"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error deleting the environment: {str(e)}"}), 500

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
