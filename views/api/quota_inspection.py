"""On-demand, bounded filesystem usage reports for quota paths."""

import fcntl
import hashlib
import json
import os
import shlex
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from flask import current_app, jsonify, request

from . import api
from .utils import run_process_output


SCAN_SCRIPT = Path(__file__).with_name("quota_usage_scan.py")
SCAN_LIMIT = 10
SCAN_MAX_ENTRIES = 250000
SCAN_MAX_SECONDS = 30
PROCESS_TIMEOUT_SECONDS = 40
CACHE_SECONDS = 300


def _get_allowed_quota_paths():
    """Return only paths reported for the current user by showquota."""
    output = run_process_output(["/sw/local/bin/showquota"], timeout=10)
    paths = set()

    for line in output.splitlines()[2:]:
        parts = line.split()
        if parts and parts[0].startswith("/"):
            paths.add(os.path.normpath(parts[0]))

    return paths


def _scan_command(path):
    common_args = [
        "--limit", str(SCAN_LIMIT),
        "--max-entries", str(SCAN_MAX_ENTRIES),
        "--max-seconds", str(SCAN_MAX_SECONDS),
    ]
    current_host = socket.getfqdn()

    if "portal" not in current_host:
        return [
            "nice", "-n", "15", sys.executable, str(SCAN_SCRIPT), path,
            *common_args,
        ], None

    login_node = str(current_app.config.get("login_node", "")).strip()
    if not login_node:
        raise RuntimeError(
            "No login node is configured for quota inspection on this cluster"
        )

    # SSH invokes a remote shell even when subprocess receives an argument
    # array, so quote every value interpolated into the remote command.
    remote_args = ["python3", "-", path, *common_args]
    remote_command = "nice -n 15 timeout 35s " + " ".join(
        shlex.quote(value) for value in remote_args
    )
    command = [
        "ssh",
        "-o", "BatchMode=yes",
        "-o", "ConnectTimeout=5",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        login_node,
        remote_command,
    ]
    return command, SCAN_SCRIPT.read_text(encoding="utf-8")


def _run_scan(path):
    command, script_input = _scan_command(path)
    result = subprocess.run(
        command,
        input=script_input,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        encoding="utf-8",
        timeout=PROCESS_TIMEOUT_SECONDS,
    )

    if result.returncode == 124:
        raise TimeoutError("The quota inspection reached its time limit")

    try:
        payload = json.loads(result.stdout.strip())
    except json.JSONDecodeError as error:
        message = result.stderr.strip() or "Quota inspection returned invalid output"
        raise RuntimeError(message) from error

    if result.returncode != 0 or payload.get("error"):
        raise RuntimeError(payload.get("error") or result.stderr.strip() or "Quota inspection failed")

    return payload


def _cache_path(path):
    digest = hashlib.sha256(path.encode("utf-8")).hexdigest()[:20]
    return os.path.join(
        tempfile.gettempdir(),
        f"hpcmosaic-quota-inspection-{os.getuid()}-{digest}.json",
    )


def _read_cached_report(path):
    cache_path = _cache_path(path)
    try:
        if time.time() - os.path.getmtime(cache_path) > CACHE_SECONDS:
            return None
        with open(cache_path, "r", encoding="utf-8") as cache_file:
            report = json.load(cache_file)
        report["cached"] = True
        return report
    except (OSError, ValueError, TypeError):
        return None


def _write_cached_report(path, report):
    cache_path = _cache_path(path)
    temporary_path = f"{cache_path}.{os.getpid()}.tmp"
    try:
        with open(temporary_path, "w", encoding="utf-8") as cache_file:
            json.dump(report, cache_file, separators=(",", ":"))
        os.replace(temporary_path, cache_path)
    except OSError:
        # Caching is a load-shedding optimization, not a reason to fail a scan.
        try:
            os.unlink(temporary_path)
        except OSError:
            pass


@api.route("/quota/inspection", methods=["POST"])
def inspect_quota_usage():
    data = request.get_json(silent=True) or {}
    requested_path = data.get("disk")
    if not isinstance(requested_path, str) or not requested_path.startswith("/"):
        return jsonify({"error": "A valid quota path is required"}), 400

    requested_path = os.path.normpath(requested_path)
    try:
        allowed_paths = _get_allowed_quota_paths()
    except (RuntimeError, subprocess.TimeoutExpired) as error:
        return jsonify({"error": f"Unable to verify quota paths: {error}"}), 503

    if requested_path not in allowed_paths:
        return jsonify({"error": "The selected path is not one of your quota paths"}), 403

    cached_report = _read_cached_report(requested_path)
    if cached_report is not None:
        return jsonify(cached_report), 200

    # Passenger can use more than one worker. A non-blocking file lock prevents
    # duplicate scans for this user from competing on the shared filesystem.
    lock_path = os.path.join(
        tempfile.gettempdir(),
        f"hpcmosaic-quota-inspection-{os.getuid()}.lock",
    )
    with open(lock_path, "w", encoding="utf-8") as lock_file:
        try:
            fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return jsonify({"error": "A quota inspection is already running"}), 429

        try:
            report = _run_scan(requested_path)
            report["cached"] = False
            _write_cached_report(requested_path, report)
            return jsonify(report), 200
        except (subprocess.TimeoutExpired, TimeoutError):
            return jsonify({"error": "The quota inspection reached its time limit"}), 504
        except (OSError, RuntimeError) as error:
            return jsonify({"error": str(error)}), 500
        finally:
            fcntl.flock(lock_file, fcntl.LOCK_UN)
