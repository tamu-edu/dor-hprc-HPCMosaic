"""
Module and virtual environment interaction routes.

These routes support the Python Venv Manager widget: listing existing
environments, creating new ones, deleting them, and fetching available
Python/toolchain versions.
"""

import os
import json
import re
import shlex
import subprocess
from collections import defaultdict
from pathlib import Path
from flask import current_app, request, jsonify
from . import api

MODULES_DIR = Path(__file__).resolve().parents[2] / "modules"
# Optional explicit override used by tests and one-off deployments.
MODULES_PATH = None
COMPILER_PATTERN = re.compile(r"^(?:AOCC|Clang|GCC(?:core)?|intel|NVHPC)/", re.I)
_catalog_cache = {
    "path": None,
    "signature": None,
    "records": None,
    "records_by_name": None,
    "extensions_by_dependency": None,
    "summaries": None,
}

MODULAIR_LIST_TIMEOUT_SECONDS = 30


def _parse_modulair_list(output):
    """Convert non-interactive ``modulair list`` output into records."""
    environments = []
    current_group = ""
    current_environment = None
    current_detail_field = None

    ansi_escape = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
    for raw_line in output.splitlines():
        line = ansi_escape.sub("", raw_line).rstrip("\r\n ")
        stripped_line = line.lstrip()
        group_match = re.match(
            r"These are your virtual environments in group '([^']+)'", stripped_line
        )
        if group_match:
            current_group = group_match.group(1)
            current_environment = None
            current_detail_field = None
            continue
        if "virtual environments in your $SCRATCH" in stripped_line:
            current_group = ""
            current_environment = None
            current_detail_field = None
            continue

        if stripped_line.startswith("For example,") or stripped_line.startswith("If you loaded"):
            current_environment = None
            current_detail_field = None
            continue

        numbered_environment = re.match(r"\d+\.\s+(.+?)\s*$", stripped_line)
        if numbered_environment:
            current_environment = {
                "name": numbered_environment.group(1),
                "description": "",
                "python_version": "",
                "GCCcore_version": "",
                "toolchain": "",
                "owner": "",
                "group": current_group,
            }
            environments.append(current_environment)
            current_detail_field = None
            continue

        if current_environment:
            versions = re.match(
                r"Python:\s*(.*?)\s*\|\s*GCC:\s*(.*?)\s*$", stripped_line
            )
            if versions:
                current_environment["python_version"] = versions.group(1)
                current_environment["GCCcore_version"] = versions.group(2)
                current_detail_field = None
                continue

            detail = re.match(
                r"(Description|Toolchain|Owner):\s*(.*?)\s*$", stripped_line
            )
            if detail:
                field_name = {
                    "Description": "description",
                    "Toolchain": "toolchain",
                    "Owner": "owner",
                }[detail.group(1)]
                current_environment[field_name] = detail.group(2)
                current_detail_field = field_name
                continue

            # In numbered output, descriptions are unlabeled and appear
            # between the environment name and the Python/GCC line.
            if stripped_line and not current_environment["python_version"]:
                current_environment["description"] = " ".join(
                    filter(None, [
                        current_environment["description"], stripped_line
                    ])
                )
                continue

            if current_detail_field and stripped_line:
                current_environment[current_detail_field] = " ".join(
                    filter(None, [
                        current_environment[current_detail_field], stripped_line
                    ])
                )
                continue

    return environments


def _get_modules_path():
    if MODULES_PATH is not None:
        return Path(MODULES_PATH)

    cluster_name = str(current_app.config.get("cluster_name", "")).strip().lower()
    if not cluster_name:
        raise OSError("Cluster name is not configured")
    if not re.fullmatch(r"[a-z0-9_-]+", cluster_name):
        raise OSError(f"Invalid cluster name: {cluster_name}")

    modules_path = MODULES_DIR / f"{cluster_name}-modules.json"
    if not modules_path.is_file():
        raise OSError(
            f"No modules catalog is available for cluster: {cluster_name}"
        )
    return modules_path


def _version_key(record):
    version = str(record.get("version", ""))
    match = re.search(r"\d+(?:\.\d+)*", version)
    numeric = tuple(int(part) for part in match.group(0).split(".")) if match else ()
    suffix = version[match.end():].lower() if match else version.lower()
    prefix = version[:match.start()].lower() if match else ""
    variant_rank = -1 if "nostub" in prefix or "nostub" in suffix else 0
    return numeric, variant_rank, suffix


def _get_catalog():
    modules_path = _get_modules_path()
    signature = (modules_path.stat().st_mtime_ns, modules_path.stat().st_size)
    cache_is_current = (
        _catalog_cache["path"] == modules_path
        and _catalog_cache["signature"] == signature
    )
    if cache_is_current:
        return _catalog_cache

    with modules_path.open("r", encoding="utf-8") as f:
        records = json.load(f)

    records_by_name = defaultdict(list)
    extensions_by_dependency = defaultdict(dict)
    for record in records:
        if record.get("name") and record.get("version") and record.get("full_name"):
            records_by_name[record["name"]].append(record)
        if record.get("is_extension") and record.get("full_name"):
            dependency_names = {
                dependency.split("/", 1)[0]
                for dependency_set in (record.get("dependencies") or [])
                if isinstance(dependency_set, list)
                for dependency in dependency_set
                if isinstance(dependency, str)
            }
            extension_summary = {
                "name": record.get("name", ""),
                "version": record.get("version", ""),
                "full_name": record["full_name"],
            }
            for dependency_name in dependency_names:
                extensions_by_dependency[dependency_name][record["full_name"]] = (
                    extension_summary
                )

    summaries = []
    for name, versions in records_by_name.items():
        sorted_versions = sorted(versions, key=_version_key)
        current = sorted_versions[-1]
        dependencies = current.get("dependencies") or []
        flattened_dependencies = [
            dependency
            for dependency_set in dependencies
            if isinstance(dependency_set, list)
            for dependency in dependency_set
        ]
        compiler = next(
            (
                dependency
                for dependency in flattened_dependencies
                if COMPILER_PATTERN.match(dependency)
            ),
            "",
        )
        first_dependency_set = next(
            (
                dependency_set
                for dependency_set in dependencies
                if isinstance(dependency_set, list) and dependency_set
            ),
            [],
        )
        load_targets = (
            first_dependency_set
            if current.get("is_extension")
            else [current["full_name"]]
        )
        summaries.append(
            {
                "name": name,
                "latest_version": current["version"],
                "description": current.get("description") or "",
                "compiler": compiler,
                "version_count": len(sorted_versions),
                "is_default": bool(current.get("is_default")),
                "is_extension": bool(current.get("is_extension")),
                "full_name": current["full_name"],
                "load_command": (
                    f"module load {' '.join(load_targets)}" if load_targets else ""
                ),
            }
        )

    summaries.sort(key=lambda summary: summary["name"].casefold())
    _catalog_cache.update(
        {
            "path": modules_path,
            "signature": signature,
            "records": records,
            "records_by_name": dict(records_by_name),
            "extensions_by_dependency": {
                name: list(extensions.values())
                for name, extensions in extensions_by_dependency.items()
            },
            "summaries": summaries,
        }
    )
    return _catalog_cache

@api.route('/get_env', methods=['GET'])
def get_envs():
    try:
        login_node = str(current_app.config.get("login_node", "")).strip()
        if not login_node:
            return jsonify({
                "error": "No internal login node is configured for this cluster"
            }), 503

        remote_command = "bash -l -c " + shlex.quote(
            "source /etc/profile >/dev/null 2>&1 && nice -n 15 modulair list"
        )
        result = subprocess.run(
            [
                "ssh",
                "-o", "BatchMode=yes",
                "-o", "ConnectTimeout=5",
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                login_node,
                remote_command,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            timeout=MODULAIR_LIST_TIMEOUT_SECONDS,
        )
        if result.returncode != 0:
            error_message = result.stderr.strip() or "ModuLair list command failed"
            return jsonify({"error": error_message}), 500

        environments = _parse_modulair_list(result.stdout)
        no_environments_reported = "no virtual environments" in result.stdout.lower()
        if not environments and not no_environments_reported:
            current_app.logger.error(
                "Unable to parse modulair list output: %r", result.stdout[:4000]
            )
            response = {
                "error": (
                    "ModuLair did not return a recognizable environment list. "
                    "Check the server log for the command output."
                )
            }
            if str(current_app.config.get("dashboard_url", "")).startswith("/pun/dev/"):
                diagnostic = result.stdout.strip() or result.stderr.strip() or "(no output)"
                diagnostic = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", diagnostic)
                response["details"] = diagnostic[:1500]
            return jsonify(response), 502

        return jsonify({"environments": environments}), 200

        # Keep this metadata-only implementation temporarily as a fallback if
        # listing all personal and shared environments proves too slow.
        # scratch = os.path.expandvars("/scratch/user/$USER")
        # metadata_path = os.path.join(scratch, "virtual_envs/metadata.json")
        # if not os.path.exists(metadata_path):
        #     return jsonify({"environments": []}), 200
        # with open(metadata_path, "r") as metadata_file:
        #     return jsonify(json.load(metadata_file)), 200
    except subprocess.TimeoutExpired:
        return jsonify({"error": "ModuLair listing timed out"}), 504
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

        login_node = str(current_app.config.get("login_node", "")).strip()
        if not login_node:
            return jsonify({
                "error": "No internal login node is configured for this cluster"
            }), 503

        # SSH runs the final argument through a remote shell. Quote every value
        # before building that command so form input cannot alter its structure.
        create_venv_command = " ".join([
            "/sw/local/bin/create_venv",
            shlex.quote(str(env_name)),
            "-d",
            shlex.quote(str(description or "")),
        ])
        login_shell_command = (
            "source /etc/profile && "
            f"module load {shlex.quote(str(gcc_version))} {shlex.quote(str(py_version))} && "
            f"{create_venv_command}"
        )
        remote_command = f"bash -l -c {shlex.quote(login_shell_command)}"
        create_cmd = [
            "ssh",
            "-o", "BatchMode=yes",
            "-o", "ConnectTimeout=5",
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            login_node,
            remote_command,
        ]

        result = subprocess.run(
            create_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding='utf-8',
        )

        if result.returncode != 0:
            return jsonify({
                "error": f"Error creating virtual environment:\n{result.stderr}"
            }), 500

        return jsonify({"message": f"'{env_name}' created successfully"}), 200

    except Exception as e:
        return jsonify({"error": f"Unexpected error creating venv: {str(e)}"}), 500

@api.route('/available_modules', methods=['GET'])
def list_available_modules():
    try:
        return jsonify(_get_catalog()["records"])
    except (OSError, json.JSONDecodeError) as e:
        return jsonify({"error": f"Unable to load available modules: {str(e)}"}), 500


@api.route('/available_modules/summary', methods=['GET'])
def list_available_module_summaries():
    try:
        return jsonify(_get_catalog()["summaries"])
    except (OSError, json.JSONDecodeError) as e:
        return jsonify({"error": f"Unable to load available modules: {str(e)}"}), 500


@api.route('/available_modules/details', methods=['GET'])
def get_available_module_details():
    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"error": "A module name is required"}), 400

    try:
        catalog = _get_catalog()
        versions = catalog["records_by_name"].get(name)
        if not versions:
            return jsonify({"error": f"Module not found: {name}"}), 404

        extensions = catalog["extensions_by_dependency"].get(name, [])

        return jsonify(
            {
                "name": name,
                "versions": sorted(versions, key=_version_key, reverse=True),
                "extensions": sorted(
                    extensions,
                    key=lambda record: (
                        record.get("name", "").casefold(),
                        _version_key(record),
                    ),
                ),
            }
        )
    except (OSError, json.JSONDecodeError) as e:
        return jsonify({"error": f"Unable to load available modules: {str(e)}"}), 500
