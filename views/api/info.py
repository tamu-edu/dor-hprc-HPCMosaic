"""
Cluster information retrieval routes.

These routes run read-only shell commands to surface cluster state
(quota, node utilization, user groups, etc.) to the frontend.
"""
import os
import re
import subprocess
import logging
from flask import jsonify
from . import api
from .utils import (
    get_user_email,
    parse_key_value_tokens,
    parse_storage_to_mib,
    percentage,
    run_process_output,
    safe_float,
    safe_int,
)

SAFE_NODE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")
GPU_PARTITION = "gpu"


def _validate_node_name(node_name):
    return bool(SAFE_NODE_NAME.fullmatch(node_name or ""))


def _normalize_partition_name(partition):
    return str(partition or "").strip().rstrip("*").lower()


def _is_gpu_partition_member(partitions):
    return any(_normalize_partition_name(partition) == GPU_PARTITION for partition in partitions)


def _normalize_slurm_node_state(state):
    value = str(state or "").lower().replace("*", "").replace("+", "").replace("#", "").replace("-", "")

    if "down" in value or "drain" in value or "fail" in value:
        return "down"
    if "maint" in value or "reserv" in value:
        return "maintenance"
    if "mix" in value:
        return "mixed"
    if "alloc" in value or "comp" in value:
        return "allocated"
    if "idle" in value:
        return "idle"
    return "unknown"


def _parse_gpu_tres_count(value):
    if not value:
        return 0

    text = str(value)
    tres_counts = re.findall(r"(?:^|,)gres/gpu(?:[:/][^=,]+)?=(\d+)", text)
    if tres_counts:
        return sum(int(count) for count in tres_counts)

    gres_counts = re.findall(r"(?:^|,)gpu(?::[^:,()]+)?:(\d+)", text)
    return sum(int(count) for count in gres_counts)


def _parse_scontrol_nodes_output(output):
    nodes = []
    current = {}

    for token in output.split():
        if "=" not in token:
            continue

        key, value = token.split("=", 1)
        if key == "NodeName" and current:
            nodes.append(current)
            current = {}
        current[key] = value

    if current:
        nodes.append(current)

    return nodes


def _get_scontrol_value(output, key):
    match = re.search(rf"(?:^|\s){re.escape(key)}=(.*?)(?=\s+\S+=|\s*$)", output, re.DOTALL)
    return match.group(1).strip() if match else None


def _parse_scontrol_node_output(output):
    node_info = parse_key_value_tokens(output)

    partitions = node_info.get("Partitions") or ""
    partitions = [partition.strip() for partition in partitions.split(",") if partition.strip()]

    return {
        "name": node_info.get("NodeName"),
        "status": node_info.get("State"),
        "partitions": partitions,
        "cpu_alloc": safe_int(node_info.get("CPUAlloc")),
        "cpu_total": safe_int(node_info.get("CPUTot")),
        "cpu_load": safe_float(node_info.get("CPULoad")),
        "real_memory": safe_int(node_info.get("RealMemory")),
        "alloc_memory": safe_int(node_info.get("AllocMem")),
        "free_memory": safe_int(node_info.get("FreeMem")),
        "gres": node_info.get("Gres"),
        "available_features": node_info.get("AvailableFeatures"),
        "active_features": node_info.get("ActiveFeatures"),
        "architecture": node_info.get("Arch"),
        "sockets": safe_int(node_info.get("Sockets")),
        "cores_per_socket": safe_int(node_info.get("CoresPerSocket")),
        "threads_per_core": safe_int(node_info.get("ThreadsPerCore")),
        "boot_time": node_info.get("BootTime"),
        "slurmd_start_time": node_info.get("SlurmdStartTime"),
        "version": node_info.get("Version"),
        "reason": _get_scontrol_value(output, "Reason"),
        "reason_user": _get_scontrol_value(output, "ReasonUid"),
        "reason_time": _get_scontrol_value(output, "ReasonTime"),
        "configured_tres": node_info.get("CfgTRES"),
        "allocated_tres": node_info.get("AllocTRES"),
    }


def _parse_node_jobs_output(output):
    jobs = []

    for line in output.splitlines():
        if not line.strip():
            continue

        fields = line.split("|")
        if len(fields) != 10:
            continue

        job_id, name, user, state, runtime, time_limit, nodes, cpus, gres, partition = fields
        jobs.append({
            "job_id": job_id,
            "name": name,
            "user": user,
            "state": state,
            "runtime": runtime,
            "time_limit": time_limit,
            "nodes": safe_int(nodes),
            "cpus": safe_int(cpus),
            "gres": gres,
            "partition": partition,
        })

    return jobs


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
            disk = parts[0]
            if not disk.startswith("/"):
                continue

            disk_usage_mib = parse_storage_to_mib(parts[1])
            disk_limit_mib = parse_storage_to_mib(parts[2])
            file_usage = safe_int(parts[3])
            file_limit = safe_int(parts[4])

            quotas.append({
                "disk": parts[0],
                "disk_usage": parts[1],
                "disk_limit": parts[2],
                "file_usage": parts[3],
                "file_limit": parts[4],
                "disk_usage_mib": disk_usage_mib,
                "disk_limit_mib": disk_limit_mib,
                "disk_usage_percent": percentage(disk_usage_mib, disk_limit_mib),
                "file_usage_count": file_usage,
                "file_limit_count": file_limit,
                "file_usage_percent": percentage(file_usage, file_limit),
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

@api.route('/nodes', methods=['GET'])
def get_nodes():
    try:
        result = subprocess.check_output(
            ['sinfo', '-N', '-h', '-o', '%N|%T|%P'],
            universal_newlines=True,
            stderr=subprocess.STDOUT
        )

        nodes = []

        for line in result.strip().split('\n'):
            if not line:
                continue

            name, status, partition = line.split('|', 2)

            nodes.append({
                'name': name,
                'status': status,
                'partition': partition
            })

        return jsonify(nodes), 200

    except subprocess.CalledProcessError as e:
        return jsonify({'error': e.output}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/gpu-resources', methods=['GET'])
def get_gpu_resources():
    try:
        output = run_process_output(["scontrol", "show", "nodes"])

        total_nodes = 0
        busy_nodes = 0
        available_nodes = 0
        total_gpus = 0
        allocated_gpus = 0

        for node in _parse_scontrol_nodes_output(output):
            partitions = [
                partition.strip()
                for partition in (node.get("Partitions") or "").split(",")
                if partition.strip()
            ]

            if not _is_gpu_partition_member(partitions):
                continue

            state = _normalize_slurm_node_state(node.get("State"))
            configured_gpus = _parse_gpu_tres_count(node.get("CfgTRES")) or _parse_gpu_tres_count(node.get("Gres"))
            allocated_node_gpus = _parse_gpu_tres_count(node.get("AllocTRES"))

            total_nodes += 1
            total_gpus += configured_gpus
            allocated_gpus += allocated_node_gpus

            if state in ("allocated", "mixed"):
                busy_nodes += 1
            elif state == "idle":
                available_nodes += 1

        return jsonify({
            "partition": GPU_PARTITION,
            "excluded_partitions": ["gpu_debug"],
            "nodes": {
                "busy": busy_nodes,
                "total": total_nodes,
                "available": available_nodes,
            },
            "gpus": {
                "allocated": allocated_gpus,
                "total": total_gpus,
            },
            "source_fields": {
                "partitions": "Partitions",
                "node_state": "State",
                "total_gpus": ["CfgTRES", "Gres"],
                "allocated_gpus": "AllocTRES",
            },
        }), 200

    except FileNotFoundError:
        return jsonify({"error": "scontrol command not found"}), 500
    except RuntimeError as e:
        return jsonify({"error": str(e) or "Unable to fetch GPU resources"}), 500
    except Exception as e:
        logging.error(f"Failed to fetch GPU resources: {e}")
        return jsonify({"error": "Unable to fetch GPU resources"}), 500


@api.route('/node/<node_name>', methods=['GET'])
def get_node_detail(node_name):
    if not _validate_node_name(node_name):
        return jsonify({"error": "Invalid node name"}), 400

    try:
        output = run_process_output(["scontrol", "show", "node", node_name])
        node_detail = _parse_scontrol_node_output(output)
        if not node_detail.get("name"):
            return jsonify({"error": "Node not found"}), 404

        return jsonify(node_detail), 200

    except FileNotFoundError:
        return jsonify({"error": "scontrol command not found"}), 500
    except RuntimeError as e:
        error_msg = str(e) or "Node lookup failed"
        status_code = 404 if "invalid node name" in error_msg.lower() or "not found" in error_msg.lower() else 500
        return jsonify({"error": error_msg}), status_code
    except Exception as e:
        logging.error(f"Failed to fetch node detail for {node_name}: {e}")
        return jsonify({"error": "Unable to fetch node detail"}), 500


@api.route('/node/<node_name>/jobs', methods=['GET'])
def get_node_jobs(node_name):
    if not _validate_node_name(node_name):
        return jsonify({"error": "Invalid node name"}), 400

    try:
        output = run_process_output(
            [
                "squeue",
                "-w", node_name,
                "-h",
                "-o", "%i|%j|%u|%T|%M|%l|%D|%C|%b|%P",
            ]
        )

        return jsonify(_parse_node_jobs_output(output)), 200

    except FileNotFoundError:
        return jsonify({"error": "squeue command not found"}), 500
    except RuntimeError as e:
        error_msg = str(e) or "Job lookup failed"
        status_code = 404 if "invalid node name" in error_msg.lower() or "not found" in error_msg.lower() else 500
        return jsonify({"error": error_msg}), status_code
    except Exception as e:
        logging.error(f"Failed to fetch jobs for node {node_name}: {e}")
        return jsonify({"error": "Unable to fetch node jobs"}), 500

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


@api.route('/system-load', methods=['GET'])
def get_system_load():
    try:
        load_1m, load_5m, load_15m = os.getloadavg()
        cpu_count = os.cpu_count() or 1

        return jsonify({
            "load": {
                "one_minute": load_1m,
                "five_minutes": load_5m,
                "fifteen_minutes": load_15m,
                "normalized_five_minutes": load_5m / cpu_count,
                "cpu_count": cpu_count,
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
