"""Shared Slurm job-detail command and parser helpers."""

import re

from .utils import run_process_output


_SCONTROL_KEY_PATTERN = r"[A-Za-z][A-Za-z0-9_/:]*"
_SCONTROL_FIELD_PATTERN = re.compile(
    rf"(?:^|\s)({_SCONTROL_KEY_PATTERN})=((?:(?!\s+{_SCONTROL_KEY_PATTERN}=).)*)"
)


def parse_scontrol_job_output(output):
    """Parse one ``scontrol show job -o`` record without losing spaced values."""
    first_record = next((line for line in str(output or "").splitlines() if line.strip()), "")
    return {
        key: value.strip()
        for key, value in _SCONTROL_FIELD_PATTERN.findall(first_record)
    }


def get_scontrol_job_fields(job_id):
    """Return all fields for one job from Slurm's one-line representation."""
    output = run_process_output(["scontrol", "show", "job", "-o", str(job_id)])
    return parse_scontrol_job_output(output)
