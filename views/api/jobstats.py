"""Optional jobstats monitoring-log parsing and API route."""

import csv
import gzip
import logging
import os
import re
from pathlib import Path

from flask import jsonify

from . import api
from .utils import run_process_output, safe_int


_MAX_FILE_BYTES = 50 * 1024 * 1024
_MAX_POINTS = 5000
_MAX_SAMPLES = 200000
_SECTOR_BYTES = 512


def _get_jobstats_context(job_id, user):
    """Use sacct to authorize a job and obtain jobstats' default output dir."""
    output = run_process_output([
        "sacct", "--noheader", "--parsable2", "--allocations",
        f"--jobs={job_id}", "--format=JobIDRaw,User,WorkDir,ElapsedRaw",
    ], timeout=20)
    for line in output.splitlines():
        fields = line.split("|")
        if len(fields) < 4 or fields[0] != job_id:
            continue
        if fields[1] != user:
            return None
        return {
            "work_dir": fields[2],
            "elapsed_seconds": safe_int(fields[3], 0),
        }
    return None


def _open_jobstats_log(path):
    """Open a bounded plain-text or gzip jobstats log."""
    if not path.is_file() or path.stat().st_size > _MAX_FILE_BYTES:
        return None
    if path.suffix == ".gz":
        return gzip.open(path, mode="rt", encoding="utf-8", errors="replace")
    return path.open(mode="rt", encoding="utf-8", errors="replace")


def _sample_elapsed(index, count, elapsed_seconds):
    if count <= 1 or elapsed_seconds <= 0:
        return index
    return round(index * elapsed_seconds / (count - 1), 3)


def _limit_jobstats_points(points):
    """Bound response size while retaining the first and last observations."""
    if len(points) <= _MAX_POINTS:
        return points
    last = len(points) - 1
    indices = {
        round(position * last / (_MAX_POINTS - 1))
        for position in range(_MAX_POINTS)
    }
    return [points[index] for index in sorted(indices)]


def _parse_jobstats_cpu(stream, elapsed_seconds=0):
    total_memory_kb = 0
    cpus_on_node = 0
    raw_samples = []
    for raw_line in stream:
        line = raw_line.strip()
        if line.startswith("CPU_MEM_TOTAL:"):
            total_memory_kb = safe_int(line.partition(":")[2].strip(), 0)
            continue
        if line.startswith("CPUS_ON_NODE:"):
            cpus_on_node = safe_int(line.partition(":")[2].strip(), 0)
            continue
        fields = line.split()
        if len(fields) < 17 or not all(re.fullmatch(r"-?\d+(?:\.\d+)?", value) for value in fields[:17]):
            continue
        free_kb = float(fields[3])
        cache_kb = float(fields[5])
        user_percent = float(fields[12])
        raw_samples.append((user_percent, free_kb, cache_kb))
        if len(raw_samples) >= _MAX_SAMPLES:
            break

    count = len(raw_samples)
    points = []
    for index, (user_percent, free_kb, cache_kb) in enumerate(raw_samples):
        points.append({
            "elapsed_seconds": _sample_elapsed(index, count, elapsed_seconds),
            "cpu_percent": user_percent * cpus_on_node if cpus_on_node else user_percent,
            "memory_gb": round(max(0, total_memory_kb - free_kb - cache_kb) / 1_000_000, 4),
        })
    return _limit_jobstats_points(points)


def _parse_jobstats_gpu(stream, elapsed_seconds=0):
    samples = []
    reader = csv.DictReader(stream, skipinitialspace=True)
    for row in reader:
        try:
            index = str(row.get("index", "")).strip()
            utilization = float(str(row.get("utilization.gpu [%]", "")).replace("%", "").strip())
            memory_used_mb = float(str(row.get("memory.used [MiB]", "")).replace("MiB", "").strip())
            memory_total_mb = float(str(row.get("memory.total [MiB]", "")).replace("MiB", "").strip())
        except (TypeError, ValueError):
            continue
        samples.append({
            "gpu": index,
            "timestamp": str(row.get("timestamp", "")).strip(),
            "utilization_percent": utilization,
            "memory_used_gb": round(memory_used_mb / 1024, 4),
            "memory_total_gb": round(memory_total_mb / 1024, 4),
        })
        if len(samples) >= _MAX_SAMPLES:
            break

    counts = {}
    for sample in samples:
        counts[sample["gpu"]] = counts.get(sample["gpu"], 0) + 1
    positions = {}
    for sample in samples:
        gpu = sample["gpu"]
        position = positions.get(gpu, 0)
        sample["elapsed_seconds"] = _sample_elapsed(position, counts[gpu], elapsed_seconds)
        positions[gpu] = position + 1
    return _limit_jobstats_points(samples)


def _parse_jobstats_io(stream, elapsed_seconds=0):
    raw_samples = []
    for raw_line in stream:
        fields = raw_line.split()
        if len(fields) != 4 or not all(re.fullmatch(r"\d+", value) for value in fields):
            continue
        raw_samples.append((int(fields[1]), int(fields[3])))
        if len(raw_samples) >= _MAX_SAMPLES:
            break
    if not raw_samples:
        return []

    initial_reads, initial_writes = raw_samples[0]
    count = len(raw_samples)
    points = [{
        "elapsed_seconds": _sample_elapsed(index, count, elapsed_seconds),
        "read_bytes": max(0, reads - initial_reads) * _SECTOR_BYTES,
        "write_bytes": max(0, writes - initial_writes) * _SECTOR_BYTES,
    } for index, (reads, writes) in enumerate(raw_samples)]
    return _limit_jobstats_points(points)


def _load_jobstats(job_id, work_dir, elapsed_seconds=0):
    """Read only exact jobstats filenames in the sacct-reported WorkDir."""
    if not work_dir or work_dir in {"Unknown", "N/A", "(null)"}:
        return {"available": False, "datasets": [], "cpu": [], "gpu": [], "io": []}
    directory = Path(work_dir).expanduser()
    if not directory.is_dir():
        return {"available": False, "datasets": [], "cpu": [], "gpu": [], "io": []}

    parsers = {
        "cpu": _parse_jobstats_cpu,
        "gpu": _parse_jobstats_gpu,
        "io": _parse_jobstats_io,
    }
    result = {"available": False, "datasets": [], "cpu": [], "gpu": [], "io": []}
    for name, parser in parsers.items():
        plain_path = directory / f"stats_{name}.{job_id}.log"
        gzip_path = directory / f"stats_{name}.{job_id}.log.gz"
        path = plain_path if plain_path.is_file() else gzip_path
        stream = _open_jobstats_log(path)
        if stream is None:
            continue
        try:
            points = parser(stream, elapsed_seconds)
        except (OSError, EOFError, csv.Error):
            points = []
        finally:
            stream.close()
        if points:
            result[name] = points
            result["datasets"].append(name)
    result["available"] = bool(result["datasets"])
    return result


@api.route("/jobs/<job_id>/jobstats", methods=["GET"])
def get_jobstats(job_id):
    """Return optional jobstats time series for one job owned by this user."""
    if not re.fullmatch(r"\d+", job_id):
        return jsonify({"error": "Invalid job ID"}), 400

    try:
        context = _get_jobstats_context(job_id, os.getenv("USER"))
        if context is None:
            return jsonify({"error": "Job not found"}), 404
        return jsonify(_load_jobstats(
            job_id,
            context["work_dir"],
            context["elapsed_seconds"],
        )), 200
    except Exception as exc:
        logging.exception("Unable to load jobstats for job %s", job_id)
        return jsonify({"error": str(exc)}), 500
