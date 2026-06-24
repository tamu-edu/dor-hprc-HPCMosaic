"""
Module and virtual environment interaction routes.

These routes support the Python Venv Manager widget: listing existing
environments, creating new ones, deleting them, and fetching available
Python/toolchain versions.
"""

import os
import json
import subprocess
from flask import request, jsonify
from . import api

@api.route('/get_env', methods=['GET'])
def get_envs():
    scratch = os.path.expandvars("/scratch/user/$USER")
    metadata_path = os.path.join(scratch, "virtual_envs/metadata.json")

    try:
        if not os.path.exists(metadata_path):
            return jsonify({"environments": []}), 200

        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

        return jsonify(metadata), 200

    except json.JSONDecodeError as e:
        return jsonify({"error": f"Metadata file is corrupted or invalid JSON: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error fetching venvs: {str(e)}"}), 500


@api.route('/delete_env/<envToDelete>', methods=['DELETE'])
def delete_env(envToDelete):
    try:
        if "SCRATCH" not in os.environ:
            os.environ["SCRATCH"] = os.path.expandvars("/scratch/user/$USER")

        result = subprocess.run(
            ['/sw/local/bin/delete_venv', envToDelete],
            input='y\n', capture_output=True, text=True
        )
        return jsonify({"message": result.stdout.strip()}), 200

    except Exception as e:
        return jsonify({"error": f"Unexpected error deleting environment: {str(e)}"}), 500


@api.route('/get_py_versions', methods=['GET'])
def get_py_versions():
    try:
        result = subprocess.run(
            ["/sw/local/bin/toolchains"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip()
            return jsonify({"error": f"Command failed: {error_msg}"}), 500

        versions = {}
        python_lines = [line for line in result.stdout.splitlines() if "Python" in line]

        for line in python_lines[1:]:
            words = line.split()

            if len(words) < 7:
                continue

            py_version = words[6]
            if py_version not in versions:
                versions[py_version] = words[2]

        return jsonify(versions), 200

    except FileNotFoundError:
        return jsonify({"error": "toolchains command not found"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error fetching Python versions: {str(e)}"}), 500


@api.route('/create_venv', methods=['POST'])
def create_venv():
    try:
        data = request.json
        env_name    = data.get('envName')
        description = data.get('description')
        py_version  = data.get('pyVersion')
        gcc_version = data.get('GCCversion')

        if not env_name or not gcc_version or not py_version:
            return jsonify({"error": "Missing required parameters (envName, pyVersion, GCCversion)"}), 400

        hostname_result = subprocess.run(['hostname', '-f'], capture_output=True, text=True)
        current_host = hostname_result.stdout.strip()

        # Portal nodes need to SSH to a login node to run module commands
        login_node = 'alogin3.cluster' if 'portal' in current_host else current_host

        create_cmd = (
            f"ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {login_node} "
            f"'bash -l -c \"source /etc/profile && "
            f"module load {gcc_version} {py_version} && "
            f"/sw/local/bin/create_venv {env_name} -d \\\"{description}\\\"\"'"
        )

        result = subprocess.run(
            create_cmd, shell=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8'
        )

        if result.returncode != 0:
            return jsonify({
                "error": f"Error creating virtual environment:\n{result.stderr}\nHostname: {current_host}"
            }), 500

        return jsonify({"message": f"'{env_name}' created successfully"}), 200

    except Exception as e:
        return jsonify({"error": f"Unexpected error creating venv: {str(e)}"}), 500

