"""Public and administrative APIs for dashboard announcements."""

import fcntl
import hashlib
import json
import os
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from urllib.parse import urlsplit

from flask import current_app, jsonify, request

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
    os.path.join(os.path.dirname(__file__), "..", "..", "var", "announcements", "announcements.json")
)


class AnnouncementValidationError(ValueError):
    """Raised when the complete announcement document is invalid."""


class AnnouncementConflictError(RuntimeError):
    """Raised when an administrator submits a stale document revision."""

    def __init__(self, document, revision):
        super().__init__("Announcements changed since they were loaded")
        self.document = document
        self.revision = revision


def _announcements_path():
    configured_path = current_app.config.get("announcements_file")
    if not configured_path:
        return _ANNOUNCEMENTS_FILE
    if os.path.isabs(configured_path):
        return configured_path
    return os.path.abspath(os.path.join(current_app.root_path, configured_path))


def _can_manage(path=None):
    target = path or _announcements_path()
    parent = os.path.dirname(target)
    return (
        os.path.isfile(target)
        and not os.path.islink(target)
        and os.access(target, os.R_OK | os.W_OK)
        and os.access(parent, os.R_OK | os.W_OK | os.X_OK)
    )


def _management_diagnostics(path):
    """Return development-only details for each management access check."""
    parent = os.path.dirname(path)

    def stat_details(candidate):
        try:
            details = os.stat(candidate)
        except OSError as exc:
            return {"error": f"{type(exc).__name__}: {exc}"}
        return {
            "uid": details.st_uid,
            "gid": details.st_gid,
            "mode": oct(details.st_mode & 0o7777),
        }

    return {
        "configured_path": current_app.config.get("announcements_file"),
        "resolved_path": path,
        "application_root": current_app.root_path,
        "working_directory": os.getcwd(),
        "effective_uid": os.geteuid(),
        "effective_gid": os.getegid(),
        "file": {
            "is_file": os.path.isfile(path),
            "is_symlink": os.path.islink(path),
            "readable": os.access(path, os.R_OK),
            "writable": os.access(path, os.W_OK),
            **stat_details(path),
        },
        "parent": {
            "readable": os.access(parent, os.R_OK),
            "writable": os.access(parent, os.W_OK),
            "searchable": os.access(parent, os.X_OK),
            **stat_details(parent),
        },
    }


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


def validate_announcement_document(document):
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
    return validated


def _decode_document(contents):
    document = json.loads(contents.decode("utf-8"))
    validate_announcement_document(document)
    return document


def _read_document(path):
    with open(path, "rb") as announcement_file:
        contents = announcement_file.read()
    return _decode_document(contents), hashlib.sha256(contents).hexdigest()


def load_active_announcements(path, now=None, cluster=None):
    """Load, validate, and time-filter a complete announcement document."""
    normalized_cluster = (
        cluster.strip().lower() if isinstance(cluster, str) and cluster.strip() else None
    )
    document, _revision = _read_document(path)
    validated = validate_announcement_document(document)

    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None or current_time.utcoffset() is None:
        raise ValueError("now must include timezone information")

    active = []
    for announcement, (starts_at, ends_at) in validated:
        if not announcement["enabled"]:
            continue
        if starts_at is not None and current_time < starts_at:
            continue
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


def _management_error(message, status):
    return jsonify({"error": message}), status


def _require_manager():
    if not _can_manage():
        return _management_error("Announcement management is not authorized", 403)
    return None


def _require_same_origin():
    fetch_site = request.headers.get("Sec-Fetch-Site", "").lower()
    if fetch_site == "cross-site":
        return _management_error("Cross-site announcement changes are not allowed", 403)
    if fetch_site == "same-origin":
        return None

    origin = request.headers.get("Origin")
    if origin:
        parsed_origin = urlsplit(origin)
        parsed_host = urlsplit(request.host_url)
        if (
            parsed_origin.scheme.lower(),
            parsed_origin.netloc.lower(),
        ) != (
            parsed_host.scheme.lower(),
            parsed_host.netloc.lower(),
        ):
            return _management_error("Cross-site announcement changes are not allowed", 403)
    return None


@contextmanager
def _announcement_lock(path):
    lock_path = f"{path}.lock"
    with open(lock_path, "a+", encoding="utf-8") as lock_file:
        try:
            os.chmod(lock_path, 0o664)
        except OSError:
            pass
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def _write_document_atomic(path, document):
    validate_announcement_document(document)
    parent = os.path.dirname(path)
    descriptor, temporary_path = tempfile.mkstemp(
        prefix=".announcements-", suffix=".json", dir=parent
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary_file:
            os.fchmod(temporary_file.fileno(), 0o664)
            json.dump(document, temporary_file, indent=2)
            temporary_file.write("\n")
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        os.replace(temporary_path, path)
        directory_descriptor = os.open(parent, os.O_RDONLY)
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)
    except Exception:
        try:
            os.unlink(temporary_path)
        except OSError:
            pass
        raise


def _mutate_document(expected_revision, mutation):
    path = _announcements_path()
    if not isinstance(expected_revision, str) or not expected_revision:
        raise AnnouncementValidationError("revision is required")

    with _announcement_lock(path):
        document, revision = _read_document(path)
        if revision != expected_revision:
            raise AnnouncementConflictError(document, revision)
        action, affected_ids = mutation(document)
        validate_announcement_document(document)
        _write_document_atomic(path, document)
        saved_document, saved_revision = _read_document(path)

    current_app.logger.info(
        "announcement_admin actor=%s action=%s ids=%s revision=%s",
        os.environ.get("USER", "unknown"),
        action,
        ",".join(affected_ids),
        saved_revision,
    )
    return saved_document, saved_revision


def _mutation_response(operation):
    authorization_error = _require_manager()
    if authorization_error:
        return authorization_error
    origin_error = _require_same_origin()
    if origin_error:
        return origin_error

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _management_error("A JSON request body is required", 400)
    try:
        document, revision = operation(data)
        return jsonify(
            {"announcements": document["announcements"], "revision": revision}
        )
    except AnnouncementConflictError as exc:
        return (
            jsonify(
                {
                    "error": str(exc),
                    "announcements": exc.document["announcements"],
                    "revision": exc.revision,
                }
            ),
            409,
        )
    except (AnnouncementValidationError, json.JSONDecodeError, TypeError) as exc:
        return _management_error(str(exc), 400)
    except OSError as exc:
        current_app.logger.error("Unable to update announcements: %s", exc)
        return _management_error("Unable to save announcements", 500)


@api.route("/announcements", methods=["GET"])
def get_announcements():
    path = _announcements_path()
    response = {"announcements": [], "can_manage": _can_manage(path)}
    if str(current_app.config.get("dashboard_url", "")).startswith("/pun/dev/"):
        response["management_diagnostics"] = _management_diagnostics(path)
    try:
        response["announcements"] = load_active_announcements(
            path,
            cluster=current_app.config.get("cluster_name"),
        )
    except (OSError, json.JSONDecodeError, AnnouncementValidationError, TypeError) as exc:
        current_app.logger.error(
            "Unable to load announcements from %s: %s", path, exc
        )
    return jsonify(response)


@api.route("/admin/announcements", methods=["GET"])
def get_managed_announcements():
    authorization_error = _require_manager()
    if authorization_error:
        return authorization_error
    try:
        document, revision = _read_document(_announcements_path())
        return jsonify(
            {"announcements": document["announcements"], "revision": revision}
        )
    except (OSError, json.JSONDecodeError, AnnouncementValidationError, TypeError) as exc:
        current_app.logger.error("Unable to load managed announcements: %s", exc)
        return _management_error(str(exc), 500)


@api.route("/admin/announcements", methods=["POST"])
def create_announcement():
    def operation(data):
        announcement = data.get("announcement")
        if not isinstance(announcement, dict):
            raise AnnouncementValidationError("announcement must be an object")
        announcement = dict(announcement)
        announcement["id"] = str(uuid.uuid4())

        def mutation(document):
            document["announcements"].append(announcement)
            return "create", [announcement["id"]]

        return _mutate_document(data.get("revision"), mutation)

    return _mutation_response(operation)


@api.route("/admin/announcements/<announcement_id>", methods=["PUT"])
def update_announcement(announcement_id):
    def operation(data):
        replacement = data.get("announcement")
        if not isinstance(replacement, dict):
            raise AnnouncementValidationError("announcement must be an object")
        replacement = dict(replacement)
        if replacement.get("id") not in (None, announcement_id):
            raise AnnouncementValidationError("announcement id cannot be changed")
        replacement["id"] = announcement_id

        def mutation(document):
            for index, announcement in enumerate(document["announcements"]):
                if announcement["id"] == announcement_id:
                    document["announcements"][index] = replacement
                    return "update", [announcement_id]
            raise AnnouncementValidationError(
                f"announcement not found: {announcement_id}"
            )

        return _mutate_document(data.get("revision"), mutation)

    return _mutation_response(operation)


@api.route("/admin/announcements/<announcement_id>", methods=["DELETE"])
def delete_announcement(announcement_id):
    def operation(data):
        def mutation(document):
            remaining = [
                announcement
                for announcement in document["announcements"]
                if announcement["id"] != announcement_id
            ]
            if len(remaining) == len(document["announcements"]):
                raise AnnouncementValidationError(
                    f"announcement not found: {announcement_id}"
                )
            document["announcements"] = remaining
            return "delete", [announcement_id]

        return _mutate_document(data.get("revision"), mutation)

    return _mutation_response(operation)


@api.route("/admin/announcements/order", methods=["PUT"])
def reorder_announcements():
    def operation(data):
        ordered_ids = data.get("ids")
        if not isinstance(ordered_ids, list) or any(
            not isinstance(item, str) for item in ordered_ids
        ):
            raise AnnouncementValidationError("ids must be a list of strings")

        def mutation(document):
            announcements_by_id = {
                announcement["id"]: announcement
                for announcement in document["announcements"]
            }
            if (
                len(ordered_ids) != len(set(ordered_ids))
                or set(ordered_ids) != set(announcements_by_id)
            ):
                raise AnnouncementValidationError(
                    "ids must contain every announcement exactly once"
                )
            document["announcements"] = [
                announcements_by_id[announcement_id]
                for announcement_id in ordered_ids
            ]
            return "reorder", ordered_ids

        return _mutate_document(data.get("revision"), mutation)

    return _mutation_response(operation)
