# Dashboard announcements

Dashboard announcements are defined in `announcements.json`. Use
`announcements.example.json` as a starting point.

Announcements are displayed in the order they appear in the JSON file. Put the
highest-priority announcement first. Disabled, scheduled, expired, or
cluster-specific entries that do not apply are removed without changing the
order of the remaining entries.

## Fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Unique, non-empty identifier for the announcement. |
| `title` | Yes | Short heading displayed in the dashboard card. |
| `message` | Yes | Announcement text displayed below the title. |
| `severity` | Yes | One of `info`, `warning`, or `critical`. |
| `enabled` | Yes | Set to `true` to make the announcement eligible for display. |
| `clusters` | No | Cluster names that should see the announcement. Missing, `null`, or `[]` means all clusters. |
| `starts_at` | No | First instant at which the announcement is active, or `null` for no start limit. |
| `ends_at` | No | Instant at which the announcement stops being active, or `null` for no end limit. |
| `link` | No | Object containing non-empty `label` and `url` strings. |

For the easiest time entry, write `starts_at` and `ends_at` in Central time:

- `2026-07-25 8:00 AM` for 12-hour time
- `2026-07-25 08:00` for 24-hour time

The dashboard applies the `America/Chicago` timezone automatically, including
the correct CST or CDT offset for the date. Existing ISO 8601 timestamps with
an explicit offset, such as `2026-07-25T08:00:00-05:00` or
`2026-07-25T13:00:00Z`, are also accepted. Use an explicit offset for a time
during the repeated hour when daylight saving time ends. Times skipped when
daylight saving time begins are invalid.

When both schedule fields are provided, `starts_at` must be earlier than
`ends_at`.

Cluster matching ignores capitalization and surrounding whitespace. For
example, `" Grace "` matches a dashboard configured for `grace`.

## Validation

Validate a file before publishing it:

```sh
python scripts/validate_announcements.py announcements.json
```

The announcement API rejects an invalid document as a whole, logs the error,
and returns no announcements until the file is corrected.

## Administrative management

The dashboard includes an addable **Announcement Manager** element for
authorized administrators. Authorization is based on the effective Linux
user's ability to write both the configured announcement file and its parent
directory. The API repeats this check for every management request; hiding the
element is not the security boundary.

For a system installation, create a dedicated runtime directory and grant the
existing `hprc` administrator group write access:

```sh
install -d -o root -g hprc -m 2775 \
  /var/www/ood/apps/sys/APP_NAME/var/announcements
install -o root -g hprc -m 0664 announcements.json \
  /var/www/ood/apps/sys/APP_NAME/var/announcements/announcements.json
```

Replace `APP_NAME` with the deployed application directory. The production
`announcements_file` setting must point at that file. The setgid directory
keeps atomically replaced files in the `hprc` group. Non-members retain read
access but cannot create the lock and temporary files required for updates.

Administrative writes validate the entire document, use an exclusive lock and
atomic replacement, and reject stale revisions rather than overwriting a
different administrator's changes.
