"""
Shared utility functions used across multiple API route modules.
None of these functions are route handlers — they're pure helpers with no
Flask dependency, which makes them straightforward to test in isolation.
"""

import os
import re
import subprocess
import logging
import shutil

PREFERENCES_FILENAME = "_preferences.json"

# Per-user app data lives under $HOME so it works on systems without /scratch.
# HPCMOSAIC_DATA_DIR overrides the location (useful for local testing).
DATA_DIR_ENV = "HPCMOSAIC_DATA_DIR"
DEFAULT_DATA_DIRNAME = ".HPCMosaic"
LEGACY_LAYOUTS_DIR = "/scratch/user/{user}/ondemand/layouts"

# Names accepted for newly created layouts (save, rename target).
_NEW_LAYOUT_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$")


def get_data_dir():
    """Return the base directory for per-user HPCMosaic data."""
    override = os.environ.get(DATA_DIR_ENV)
    if override:
        return os.path.expanduser(override)
    return os.path.join(os.path.expanduser("~"), DEFAULT_DATA_DIRNAME)


def _migrate_legacy_layouts(user, dest):
    """
    Create `dest`, seeding it with *.json files from the old scratch layouts
    directory if one exists. The scratch copy is left untouched as a backup.
    Files are staged in a temp dir and renamed into place so concurrent
    requests never see a partially copied directory.
    """
    legacy = LEGACY_LAYOUTS_DIR.format(user=user)
    try:
        legacy_files = [
            f for f in os.listdir(legacy)
            if f.endswith('.json') and os.path.isfile(os.path.join(legacy, f))
        ]
    except OSError:
        legacy_files = []

    if not legacy_files:
        os.makedirs(dest, exist_ok=True)
        return

    staging = f"{dest}.tmp-{os.getpid()}"
    try:
        os.makedirs(staging, exist_ok=True)
        for name in legacy_files:
            shutil.copy2(os.path.join(legacy, name), os.path.join(staging, name))
        os.rename(staging, dest)
        logging.info(f"Migrated {len(legacy_files)} layout file(s) from {legacy} to {dest}")
    except OSError as e:
        # Another request may have created dest first; either way fall back
        # to whatever dest holds (or an empty dir).
        logging.warning(f"Layout migration from {legacy} skipped: {e}")
        shutil.rmtree(staging, ignore_errors=True)
        os.makedirs(dest, exist_ok=True)


def get_layouts_dir(user):
    """Return the layouts directory path for a user, creating (and migrating) it if needed."""
    path = os.path.join(get_data_dir(), "layouts")
    if not os.path.isdir(path):
        os.makedirs(get_data_dir(), exist_ok=True)
        _migrate_legacy_layouts(user, path)
    return path


def resolve_layout_path(layouts_dir, layout_name, creating=False):
    """
    Return the file path for a named layout, or raise ValueError if the name
    is unsafe. `creating=True` applies a strict allowlist for new names;
    otherwise any plain file name is accepted so pre-existing layouts with
    unusual names can still be loaded, renamed, or deleted.
    """
    if not isinstance(layout_name, str) or not layout_name:
        raise ValueError("Layout name is required")
    if creating:
        if not _NEW_LAYOUT_NAME_RE.match(layout_name):
            raise ValueError(
                "Layout names must be 1-64 characters: letters, digits, spaces, "
                "'.', '_' or '-', starting with a letter or digit"
            )
    elif (
        any(c in layout_name for c in ('/', '\\', '\0'))
        or layout_name in ('.', '..')
        or layout_name.startswith('_')
    ):
        raise ValueError("Invalid layout name")

    base = os.path.realpath(layouts_dir)
    path = os.path.realpath(os.path.join(base, f"{layout_name}.json"))
    if os.path.dirname(path) != base:
        raise ValueError("Invalid layout name")
    return path


def get_preferences_path(user):
    """Return the path to the user's preferences file."""
    return os.path.join(get_layouts_dir(user), PREFERENCES_FILENAME)


def safe_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_positive_int(value, default, maximum=None):
    parsed = safe_int(value, default)
    parsed = max(1, parsed)

    if maximum:
        parsed = min(parsed, maximum)

    return parsed


def percentage(used, limit):
    if used is None or limit in (None, 0):
        return None
    return round((used / limit) * 100, 2)


def parse_storage_to_mib(value):
    match = re.fullmatch(r"\s*([\d.]+)\s*([KMGTPE]?)\s*", str(value or ""), re.IGNORECASE)
    if not match:
        return None

    amount = safe_float(match.group(1))
    if amount is None:
        return None

    multipliers = {
        "": 1 / 1024,
        "K": 1 / 1024,
        "M": 1,
        "G": 1024,
        "T": 1024 * 1024,
        "P": 1024 * 1024 * 1024,
        "E": 1024 * 1024 * 1024 * 1024,
    }
    return amount * multipliers.get(match.group(2).upper(), 1)


def parse_key_value_tokens(output):
    values = {}

    for token in output.split():
        if "=" not in token:
            continue

        key, value = token.split("=", 1)
        values[key] = value

    return values


def split_nonempty_lines(value):
    return [line.strip() for line in str(value or "").splitlines() if line.strip()]


def run_process_output(command, timeout=20):
    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        encoding="utf-8",
        timeout=timeout,
    )

    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())

    return result.stdout


def get_user_email(username):
    """
    Resolve a cluster username to an institutional email address.

    Reads the system email mapping file (format: u.username:email:first:last).
    Falls back to username@tamu.edu if no mapping is found or the file is absent.
    """

    try:
        mapping_file = "/usr/local/etc/email_mapping.access.login"

        if os.path.exists(mapping_file):
            with open(mapping_file, 'r') as f:
                for line in f:
                    line = line.strip()

                    if line and not line.startswith('#'):
                        parts = line.split(':')

                        if len(parts) >= 4:
                            local_user, real_email = parts[0].strip(), parts[1].strip()
                            if local_user == username:
                                return real_email

        logging.warning(f"No email mapping found for {username}, using default")
        return f"{username}@tamu.edu"

    except Exception as e:
        logging.error(f"Error reading email mapping: {e}")
        return f"{username}@tamu.edu"


def get_group_directory_info(group_name):
    """
    Return the scratch directory path and owner for a group.
    Inspects /scratch/group/ via `ls -la` and resolves symlinks if present.
    """
    directory_path = f"/scratch/group/{group_name}"
    owner = None

    try:
        result = subprocess.check_output(['ls', '-la', '/scratch/group/'], encoding='utf-8')
        for line in result.strip().split('\n'):
            if group_name in line:
                parts = line.split()
                if len(parts) >= 3:
                    owner = parts[2]

                if '->' in line:
                    target = line.split('->')[-1].strip()
                    directory_path = target if target.startswith('/') else f"/scratch/group/{target}"
                break

        else:
            logging.warning(f"No match found for group '{group_name}' in /scratch/group/")

    except subprocess.CalledProcessError as e:
        logging.error(f"Error fetching group directory info for {group_name}: {e}")

    return {"directory": directory_path, "owner": owner}


def clean_number(value):
    """
    Strip non-numeric characters (e.g. 'TB', 'GB') and return a float.
    Returns None if the input is None or cannot be converted.
    """
    if value:
        try:
            return float(re.sub(r"[^\d.]+", "", value))

        except ValueError:
            return None

    return None


def run_command(command):
    """
    Run a shell command and return its stdout as a string.
    Raises RuntimeError on non-zero exit code.
    """

    try:
        result = subprocess.run(
            command, shell=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8'
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip()
            raise RuntimeError(error_msg)
        return result.stdout.strip()

    except Exception as e:
        logging.error(f"Command error: {e}")
        raise RuntimeError(str(e))

