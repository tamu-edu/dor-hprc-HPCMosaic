"""Dashboard announcements loaded from a staff-editable JSON file."""

import json
import logging
import os
from datetime import datetime, timezone

from flask import current_app, jsonify

from . import api


_SEVERITIES = {"info", "warning", "critical"}
_EMPTY_RESPONSE = {"announcements": []}
_ANNOUNCEMENTS_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "announcements.json")
)


class AnnouncementValidationError(ValueError):
    """Raised when the complete announcement document is invalid."""


def _parse_timestamp(value, field, announcement_id):
    if value is None:
        return None
    if not isinstance(value, str):
        raise AnnouncementValidationError(
            f"{announcement_id}: {field} must be an ISO timestamp or null"
        )

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise AnnouncementValidationError(
            f"{announcement_id}: {field} is not a valid ISO timestamp"
        ) from exc

    # Scheduling is ambiguous without an offset and cannot safely be compared
    # with the timezone-aware current time used by the API.
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise AnnouncementValidationError(
            f"{announcement_id}: {field} must include a timezone offset"
        )
    return parsed


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
    created_at = _parse_timestamp(
        announcement.get("created_at"), "created_at", announcement_id
    )
    if created_at is None:
        raise AnnouncementValidationError(
            f"{announcement_id}: created_at must be an ISO timestamp"
        )
    if starts_at and ends_at and starts_at >= ends_at:
        raise AnnouncementValidationError(
            f"{announcement_id}: starts_at must be before ends_at"
        )

    return starts_at, ends_at, created_at


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
    for announcement, (starts_at, ends_at, created_at) in validated:
        if not announcement["enabled"]:
            continue
        if starts_at is not None and current_time < starts_at:
            continue
        # The end instant is no longer part of the active window.
        if ends_at is not None and current_time >= ends_at:
            continue
        announcement_clusters = announcement.get("clusters")
        if announcement_clusters is not None:
            normalized_clusters = {
                cluster.strip().lower() for cluster in announcement_clusters
            }
            if normalized_cluster not in normalized_clusters:
                continue
        active.append((announcement, created_at))

    # Python's sort is stable, so announcements with the same creation
    # timestamp retain their order from the source document.
    active.sort(key=lambda item: item[1], reverse=True)
    return [announcement for announcement, _created_at in active]


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
