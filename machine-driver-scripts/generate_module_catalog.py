#!/usr/bin/env python3
"""Generate the Software Modules catalog from Lmod.

Writes <cluster>-modules.json in the format read by views/api/modules.py.
Copy the result into <app root>/modules/ on the dashboard host.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


DEFAULT_WORKERS = 5
COMMAND_TIMEOUT = 60
# The dashboard's config.yml, when this script runs from a set-up checkout.
CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yml"
# Must match the cluster_name check in views/api/modules.py.
CLUSTER_NAME_PATTERN = re.compile(r"[a-z0-9_-]+")
CONFIG_CLUSTER_NAME_PATTERN = re.compile(
    r"""^\s+cluster_name:\s*["']?([^"'#\s]+)["']?""", re.M
)

EXTENSION_PATTERN = re.compile(r"^(?P<full_name>.+?)\s+\(E\)$")
EXTENSION_PROVIDER_PATTERN = re.compile(
    r"^(?P<provider>\S+/\S+)(?:\s+\((?P<hierarchy>[^)]+)\))?$"
)
PREREQUISITE_HEADING = "You will need to load all module(s)"
EXTENSION_HEADING = "This extension is provided by the following modules"
DESCRIPTION_HEADING = "Description:"


def run_module_command(command: str, *args: str) -> str:
    # A login shell makes the `module` function available. Arguments are
    # passed positionally so module names are never parsed by the shell.
    result = subprocess.run(
        ["bash", "-lc", command, "bash", *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        check=True,
        timeout=COMMAND_TIMEOUT,
    )
    return result.stdout


def parse_module_line(raw_line: str) -> Optional[Dict[str, Any]]:
    line = raw_line.strip()

    if not line or "/" not in line or line.endswith("/"):
        return None

    extension_match = EXTENSION_PATTERN.match(line)
    if extension_match:
        full_name = extension_match.group("full_name")
        is_extension = True
    else:
        full_name = line
        is_extension = False

    name, version = full_name.split("/", 1)
    if not version:
        return None

    return {
        "name": name,
        "version": version,
        "full_name": full_name,
        "is_extension": is_extension,
    }


def get_all_modules() -> List[Dict[str, Any]]:
    output = run_module_command("module --terse --redirect spider")

    modules = []
    for raw_line in output.splitlines():
        module = parse_module_line(raw_line)
        if module is not None:
            modules.append(module)
    return modules


def parse_module_details(
    output: str,
) -> Tuple[List[List[str]], bool, Optional[str]]:
    dependencies: List[List[str]] = []
    is_extension = False
    section: Optional[str] = None
    section_has_data = False
    description_lines: List[str] = []
    description_finished = False

    for raw_line in output.splitlines():
        line = raw_line.strip()

        # Only use Lmod's top-level Description section. The Help section can
        # contain another "Description" heading with different formatting.
        if line == DESCRIPTION_HEADING and not description_finished:
            section = "description"
            section_has_data = False
            continue

        if PREREQUISITE_HEADING in line:
            if section == "description":
                description_finished = True
            section = "prerequisites"
            section_has_data = False
            continue

        if EXTENSION_HEADING in line:
            if section == "description":
                description_finished = True
            section = "extensions"
            section_has_data = False
            is_extension = True
            continue

        if EXTENSION_PATTERN.match(line):
            is_extension = True

        if section is None:
            continue

        if not line:
            if section_has_data:
                if section == "description":
                    description_finished = True
                section = None
            continue

        if section == "description":
            description_lines.append(line)
            section_has_data = True
            continue

        if section == "prerequisites":
            modules = line.split()
            if modules and all("/" in module for module in modules):
                dependencies.append(modules)
                section_has_data = True
        else:
            provider_match = EXTENSION_PROVIDER_PATTERN.match(line)
            if provider_match:
                provider = provider_match.group("provider")
                hierarchy = provider_match.group("hierarchy")
                path = hierarchy.split() if hierarchy else []
                path.append(provider)
                dependencies.append(path)
                section_has_data = True

    unique_dependencies = []
    seen = set()
    for dependency_path in dependencies:
        key = tuple(dependency_path)
        if key not in seen:
            seen.add(key)
            unique_dependencies.append(dependency_path)

    description = " ".join(description_lines) or None
    return unique_dependencies, is_extension, description


def enrich_module(module: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    enriched = module.copy()

    try:
        output = run_module_command(
            'module --redirect spider "$1"', module["full_name"]
        )
        dependencies, is_extension, description = parse_module_details(output)
        enriched["is_extension"] = enriched["is_extension"] or is_extension
        enriched["dependencies"] = dependencies
        enriched["description"] = description
    except subprocess.TimeoutExpired:
        enriched["dependencies"] = []
        enriched["description"] = None
        enriched["error"] = (
            f"Lookup timed out after {COMMAND_TIMEOUT} seconds"
        )
    except subprocess.CalledProcessError as error:
        enriched["dependencies"] = []
        enriched["description"] = None
        message = error.stderr.strip() or "No error output"
        enriched["error"] = (
            f"Lookup failed with exit code {error.returncode}: {message}"
        )
    except OSError as error:
        enriched["dependencies"] = []
        enriched["description"] = None
        enriched["error"] = f"Could not run module lookup: {error}"

    return enriched, os.getpid()


def write_json_atomically(path: Path, data: Any) -> None:
    """Replace path in one step so the dashboard never reads a partial file.

    The dashboard reloads the catalog whenever the file's mtime or size
    changes, so writing in place could expose a half-written file.
    """
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(
        dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output_file:
            json.dump(data, output_file, indent=2)
            output_file.write("\n")
        # mkstemp creates 0600; the dashboard runs as each user, so the
        # catalog must be world-readable.
        os.chmod(temp_name, 0o644)
        os.replace(temp_name, str(path))
    except BaseException:
        try:
            os.unlink(temp_name)
        except OSError:
            pass
        raise


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be at least 1")
    return parsed


def cluster_name(value: str) -> str:
    name = value.strip().lower()
    if not CLUSTER_NAME_PATTERN.fullmatch(name):
        raise argparse.ArgumentTypeError(
            "must contain only letters, digits, '_' and '-'"
        )
    return name


def configured_cluster_name() -> Optional[str]:
    """Read cluster_name from the dashboard's config.yml, if there is one.

    This is the name the backend uses to find the catalog, so it's preferred
    over SLURM_CLUSTER_NAME, which can differ.
    """
    try:
        text = CONFIG_PATH.read_text(encoding="utf-8")
    except OSError:
        return None

    try:
        import yaml
    except ImportError:
        # The system python3 may not have PyYAML. cluster_name is a plain
        # scalar in config.yml.template, so a line match is enough.
        match = CONFIG_CLUSTER_NAME_PATTERN.search(text)
        return match.group(1) if match else None

    try:
        config = yaml.safe_load(text) or {}
    except yaml.YAMLError:
        return None
    for section in ("production", "development"):
        value = (config.get(section) or {}).get("cluster_name")
        if value:
            return str(value)
    return None


def allocated_workers() -> int:
    """Use the Slurm CPU allocation when running inside a submitted job."""
    slurm_cpus = os.environ.get("SLURM_CPUS_PER_TASK")
    if slurm_cpus:
        try:
            return positive_int(slurm_cpus)
        except (ValueError, argparse.ArgumentTypeError):
            pass
    return DEFAULT_WORKERS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Collect Lmod module descriptions and dependency information "
            "into the HPCMosaic Software Modules catalog."
        )
    )
    parser.add_argument(
        "--cluster",
        type=cluster_name,
        default=configured_cluster_name() or os.environ.get("SLURM_CLUSTER_NAME"),
        help=(
            "cluster name; names the output <cluster>-modules.json "
            f"(default: cluster_name from {CONFIG_PATH}, "
            "otherwise SLURM_CLUSTER_NAME)"
        ),
    )
    parser.add_argument(
        "--workers",
        type=positive_int,
        default=allocated_workers(),
        help=(
            "number of worker processes (default: SLURM_CPUS_PER_TASK, "
            f"otherwise {DEFAULT_WORKERS})"
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="output JSON path (default: <cluster>-modules.json)",
    )
    parser.add_argument(
        "--progress-every",
        type=positive_int,
        default=25,
        metavar="N",
        help="print worker progress every N completed lookups (default: 25)",
    )
    args = parser.parse_args()

    if args.output is None:
        if not args.cluster:
            parser.error(
                "pass --cluster or --output (no config.yml cluster_name "
                "and SLURM_CLUSTER_NAME is unset)"
            )
        args.output = Path(f"{args.cluster}-modules.json")
    return args


def main() -> None:
    args = parse_args()
    modules = get_all_modules()
    total = len(modules)
    if total == 0:
        # Don't replace a working catalog with an empty one.
        sys.exit("module spider returned no modules; not writing a catalog")

    enriched_modules: List[Optional[Dict[str, Any]]] = [None] * total
    worker_counts: Counter = Counter()

    print(
        f"Found {total} modules; starting {args.workers} worker processes",
        flush=True,
    )
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(enrich_module, module): index
            for index, module in enumerate(modules)
        }
        for completed, future in enumerate(as_completed(futures), start=1):
            index = futures[future]
            enriched_module, worker_pid = future.result()
            enriched_modules[index] = enriched_module
            worker_counts[worker_pid] += 1
            if completed % args.progress_every == 0 or completed == total:
                workers = ", ".join(
                    f"pid {pid}: {count}"
                    for pid, count in sorted(worker_counts.items())
                )
                print(
                    f"Completed {completed}/{total} ({workers})",
                    flush=True,
                )

    write_json_atomically(args.output, enriched_modules)
    print(f"Wrote {total} modules to {args.output}", flush=True)

    failed = [module for module in enriched_modules if "error" in module]
    if failed:
        # Failed lookups are still written, without dependencies or a
        # description, so the module stays searchable.
        print(
            f"{len(failed)} lookups failed; see the \"error\" key in the "
            "output. First failure: "
            f"{failed[0]['full_name']}: {failed[0]['error']}",
            file=sys.stderr,
            flush=True,
        )


if __name__ == "__main__":
    main()
