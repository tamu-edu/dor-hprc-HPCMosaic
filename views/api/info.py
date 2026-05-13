"""
Cluster information retrieval routes.

These routes run read-only shell commands to surface cluster state
(quota, node utilization, user groups, etc.) to the frontend.
"""
import os
import subprocess
import logging
from flask import request, jsonify
from . import api
from .utils import get_user_email


@api.route('/user-data', methods=['GET'])
def get_user_data():
    try:
        user = os.environ.get('USER', 'unknown')
        email = get_user_email(user)
        return jsonify({"user": user, "email": email}), 200

    except Exception as e:
        logging.error(f"Failed to fetch user data: {e}")
        return jsonify({"error": "Unable to fetch user data"}), 500


@api.route('/sinfo', methods=['GET'])
def get_sinfo():
    try:
        result = subprocess.check_output(
            "/sw/local/bin/retrieve_sinfo", shell=True, stderr=subprocess.STDOUT
        )
        output = result.decode("utf-8")
        return jsonify(eval(output)), 200

    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Command failed: {e.output.decode('utf-8')}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/showquota', methods=['GET'])
def get_quota():
    try:
        result = subprocess.check_output(
            "/sw/local/bin/showquota", shell=True, stderr=subprocess.STDOUT
        )
        lines = result.decode("utf-8").strip().split("\n")

        if len(lines) < 2:
            return jsonify({"error": "Unexpected output format from showquota"}), 500

        quotas = []
        for line in lines[2:]:
            parts = line.split()
            if len(parts) < 5:
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
        return jsonify({"error": f"Command failed: {e.output.decode('utf-8')}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/groups', methods=['GET'])
def get_user_groups():

    try:
        result = subprocess.check_output("groups", shell=True, stderr=subprocess.STDOUT)
        groups = result.decode("utf-8").strip().split()
        return jsonify({"groups": groups}), 200

    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Command failed: {e.output.decode('utf-8')}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/cpuavail', methods=['GET'])
def get_cpuavail():
    try:
        result = subprocess.check_output(
            "/sw/local/bin/cpuavail", shell=True, stderr=subprocess.STDOUT
        )

        lines = result.decode("utf-8").strip().split("\n")

        config_start = next((i for i, l in enumerate(lines) if "CONFIGURATION" in l), -1)
        avail_start  = next((i for i, l in enumerate(lines) if "AVAILABILITY"  in l), -1)

        if config_start == -1 or avail_start == -1:
            return jsonify({"error": "Unexpected output format from cpuavail"}), 500

        config_data = []

        for line in lines[config_start + 3: avail_start - 1]:
            parts = line.split()

            if len(parts) == 2:
                config_data.append({"node_type": parts[0], "node_count": int(parts[1])})

        availability_data = []

        for line in lines[avail_start + 3:]:
            parts = line.split()

            if len(parts) == 3:
                availability_data.append({
                    "node_name": parts[0],
                    "cpus_available": int(parts[1]),
                    "memory_available": int(parts[2]),
                })

        return jsonify({"configuration": config_data, "availability": availability_data}), 200

    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Command failed: {e.output.decode('utf-8')}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500
