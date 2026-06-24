"""
Shared utility functions used across multiple API route modules.
None of these functions are route handlers — they're pure helpers with no
Flask dependency, which makes them straightforward to test in isolation.
"""

import os
import re
import subprocess
import logging

PREFERENCES_FILENAME = "_preferences.json"


def get_layouts_dir(user):
    """Return the layouts directory path for a user, creating it if needed."""
    path = f"/scratch/user/{user}/ondemand/layouts"
    os.makedirs(path, exist_ok=True)
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

