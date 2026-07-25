"""Dashboard announcements loaded from a staff-editable JSON file."""

import json
import os
from datetime import datetime, timezone

from flask import current_app, jsonify

from . import api

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - used on Python versions before 3.9
    from backports.zoneinfo import ZoneInfo


_SEVERITIES = {"info", "warning", "critical"}
_EMPTY_RESPONSE = {"announcements": []}
_ANNOUNCEMENT_TIMEZONE = ZoneInfo("America/Chicago")
_LOCAL_TIMESTAMP_FORMATS = ("%Y-%m-%d %I:%M %p", "%Y-%m-%d %H:%M")
_ANNOUNCEMENTS_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "announcements.json")
)


class AnnouncementValidationError(ValueError):
    """Raised when the complete announcement document is invalid."""


def _localize_timestamp(parsed, field, announcement_id):
    candidates = [
        parsed.replace(tzinfo=_ANNOUNCEMENT_TIMEZONE, fold=fold)
        for fold in (0, 1)
    ]
    valid_candidates = [
        candidate
        for candidate in candidates
        if candidate.astimezone(timezone.utc)
        .astimezone(_ANNOUNCEMENT_TIMEZONE)
        .replace(tzinfo=None)
        == parsed
    ]

    if not valid_candidates:
        raise AnnouncementValidationError(
            f"{announcement_id}: {field} is not a valid America/Chicago local time"
        )
    if (
        len(valid_candidates) == 2
        and valid_candidates[0].utcoffset() != valid_candidates[1].utcoffset()
    ):
        raise AnnouncementValidationError(
            f"{announcement_id}: {field} is ambiguous in America/Chicago; "
            "use an ISO timestamp with a timezone offset"
        )
    return valid_candidates[0]


def _parse_timestamp(value, field, announcement_id):
    if value is None:
        return None
    if not isinstance(value, str):
        raise AnnouncementValidationError(
            f"{announcement_id}: {field} must be a timestamp string or null"
        )

    stripped_value = value.strip()
    try:
        parsed = datetime.fromisoformat(
            stripped_value[:-1] + "+00:00"
            if stripped_value.endswith("Z")
            else stripped_value
        )
    except ValueError:
        parsed = None

    if parsed is not None and parsed.tzinfo is not None and parsed.utcoffset() is not None:
        return parsed

    for timestamp_format in _LOCAL_TIMESTAMP_FORMATS:
        try:
            local_time = datetime.strptime(stripped_value, timestamp_format)
        except ValueError:
            continue
        return _localize_timestamp(local_time, field, announcement_id)

    raise AnnouncementValidationError(
        f"{announcement_id}: {field} must be an ISO timestamp with an offset "
        "or a local time like 2026-07-25 8:00 AM"
    )


def _validate_announcement(announcement, index):
    if not isinstance(announcement, dict):
        raise AnnouncementValidationError(
            f"announcement at index {index} must be an object"
        )

    for field in ("id", "title", "message", "severity"):
        if not isinstance(announcement.get(field), str) or not announcement[field].strip():
            raise AnnouncementValidationError(
                f"announcement at index {index} has an invalid or missing {field}"
            )

    announcement_id = announcement["id"]
    if not isinstance(announcement.get("enabled"), bool):
        raise AnnouncementValidationError(
            f"{announcement_id}: enabled must be true or false"
        )
    if announcement["severity"] not in _SEVERITIES:
        raise AnnouncementValidationError(
            f"{announcement_id}: severity must be info, warning, or critical"
        )

    clusters = announcement.get("clusters")
    if clusters is not None and (
        not isinstance(clusters, list)
        or any(not isinstance(cluster, str) or not cluster.strip() for cluster in clusters)
    ):
        raise AnnouncementValidationError(
            f"{announcement_id}: clusters must be a list of non-empty strings"
        )

    link = announcement.get("link")
    if link is not None and (
        not isinstance(link, dict)
        or not isinstance(link.get("label"), str)
        or not link["label"].strip()
        or not isinstance(link.get("url"), str)
        or not link["url"].strip()
    ):
        raise AnnouncementValidationError(
            f"{announcement_id}: link must contain non-empty label and url strings"
        )

    starts_at = _parse_timestamp(
        announcement.get("starts_at"), "starts_at", announcement_id
    )
    ends_at = _parse_timestamp(
        announcement.get("ends_at"), "ends_at", announcement_id
    )
    if starts_at and ends_at and starts_at >= ends_at:
        raise AnnouncementValidationError(
            f"{announcement_id}: starts_at must be before ends_at"
        )

    return starts_at, ends_at


def load_active_announcements(path, now=None, cluster=None):
    """Load, validate, and time-filter a complete announcement document."""
    normalized_cluster = (
        cluster.strip().lower() if isinstance(cluster, str) and cluster.strip() else None
    )
    with open(path, "r", encoding="utf-8") as announcement_file:
        document = json.load(announcement_file)

    if not isinstance(document, dict) or not isinstance(
        document.get("announcements"), list
    ):
        raise AnnouncementValidationError(
            "top-level announcements field must be a list"
        )

    validated = []
    ids = set()
    for index, announcement in enumerate(document["announcements"]):
        schedule = _validate_announcement(announcement, index)
        if announcement["id"] in ids:
            raise AnnouncementValidationError(
                f"duplicate announcement id: {announcement['id']}"
            )
        ids.add(announcement["id"])
        validated.append((announcement, schedule))

    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None or current_time.utcoffset() is None:
        raise ValueError("now must include timezone information")

    active = []
    for announcement, (starts_at, ends_at) in validated:
        if not announcement["enabled"]:
            continue
        if starts_at is not None and current_time < starts_at:
            continue
        # The end instant is no longer part of the active window.
        if ends_at is not None and current_time >= ends_at:
            continue
        announcement_clusters = announcement.get("clusters")
        if announcement_clusters:
            normalized_clusters = {
                cluster.strip().lower() for cluster in announcement_clusters
            }
            if normalized_cluster not in normalized_clusters:
                continue
        active.append(announcement)

    return active


@api.route("/announcements", methods=["GET"])
def get_announcements():
    path = _ANNOUNCEMENTS_FILE
    try:
        return jsonify(
            {
                "announcements": load_active_announcements(
                    path,
                    cluster=current_app.config.get("cluster_name"),
                )
            }
        )
    except (OSError, json.JSONDecodeError, AnnouncementValidationError, TypeError) as exc:
        current_app.logger.error(
            "Unable to load announcements from %s: %s", path, exc
        )
        return jsonify(_EMPTY_RESPONSE)
