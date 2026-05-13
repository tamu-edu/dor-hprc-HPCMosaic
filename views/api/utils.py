"""
Shared utility functions used across multiple API route modules.
None of these functions are route handlers — they're pure helpers with no
Flask dependency, which makes them straightforward to test in isolation.
"""

import os
import re
import subprocess
import logging

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


