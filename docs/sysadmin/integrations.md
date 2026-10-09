# External integrations

These services are shared by several widgets. See [README.md](README.md) for
the overview and [widgets.md](widgets.md) for per-widget details.

## Support-request webhook

Every request form (quota, group, help, software, account purchase,
acknowledgement) is submitted to the backend, which builds a JSON payload and
POSTs it to:

```
{hprcbot_route}/HPRCapp/OOD          # views/api/bot_requests.py:27
```

`hprcbot_route` comes from the `development` block of `config.yml`. At TAMU
it is the "HPRC Bot", an internal service that turns each payload into a
helpdesk ticket and, for group requests, can make the change itself.

**What your receiver must do:**
- Accept `POST` with `Content-Type: application/json`.
- Return **HTTP 200** on success. The response body is ignored, and any other
  status counts as a failure.
- Respond within **5 s** for quota requests and **15 s** for everything else.

To use a different URL path, edit `bot_requests.py:27`. With no receiver,
submissions fail and the user sees an error that includes `help_email`. You
can remove the buttons instead (see the README checklist).

### Common fields

Every payload includes:

| Field | Source |
|---|---|
| `request_type` | `Quota`, `Group`, `Help`, `Software`, `Purchase` or `Acknowledgement` |
| `user` | `$USER` of the PUN |
| `email` | From the [email mapping](#email-identity) |
| `cluster_name` | `config.yml` (`development.cluster_name`) |

### `Quota`: `POST /api/quota`

```json
{
  "request_type": "Quota", "user": "alice", "email": "alice@example.edu", "cluster_name": "Grace",
  "directory": "/scratch/user/alice",
  "current_quota": 1.0, "current_file_limit": 250000,
  "desired_disk": 5.0, "total_file_limit": 500000,
  "request_justification": "PI aware: Yes\nStored data: ...\nResearch: ...\nJob size: ...\nPlan: ...",
  "comment": "",
  "confirmBuyin": "no",
  "has_previous": false,
  "request_until": "",
  "account_number": "",
  "project_pi": "Dr. Smith"
}
```

- `current_quota` and `desired_disk` are numbers in **TB**. Unit text is
  stripped.
- `confirmBuyin` is `"yes"` or `"no"`. When it is `"yes"`, `request_until`
  (YYYY-MM-DD) and `account_number` are filled in.
- `has_previous` is `true` when the user picked "Extension".

**Email fallback (quota only):** if the webhook fails, the backend emails a
plain-text summary.
- Subject: `[<cluster>] Quota Request: <user>`
- From: the user's email; To: `request_email`
- Relay: `smtp.tamu.edu` port 25, no TLS or authentication
  (`bot_requests.py:124`). **Change this host for your site.**

If the email also fails, the user gets HTTP 202 with a "contact `help_email`"
message.

### `Group`: `POST /api/group`

```json
{
  "request_type": "Group", "user": "alice", "email": "...", "cluster_name": "...",
  "comments": "",
  "new_group": true,
  "group_name": "labx",
  "directory": "/scratch/group/labx",
  "action": "createGroup",
  "Add": "createGroup",
  "target_users": ["bob", "carol"]
}
```

- `action` (also repeated in `Add`) is one of `createGroup`, `addMembers`,
  `deleteMembers` or `requestAccess`.
- `target_users` is only present when it's non-empty.
- `directory` comes from the [group directory lookup](#group-directories).

### `Help`: `POST /api/help`

```json
{
  "request_type": "Help", "user": "...", "email": "...", "cluster_name": "...",
  "help_topic": "jobs",
  "issue_description": "", "error_message": "",
  "job_file_path": "", "job_id": "",
  "program_file_path": "", "additional_information": ""
}
```

`help_topic` is `software`, `jobs`, `accounts`, `other` or `Other` (the last
one is sent by the Acknowledgement form). The other fields are filled in
depending on the topic. For `accounts`, `issue_description` is a sentence such
as "Add user X to account Y." or "Transfer N SUs from A to B."

### `Software`: `POST /api/software`

```json
{
  "request_type": "Software", "user": "...", "email": "...", "cluster_name": "...",
  "software_name": "GROMACS", "software_version": "2024.1",
  "software_link": "https://...", "toolchains": "foss/2023a",
  "request_justification": "Category: Bio\n...", "additional_notes": ""
}
```

### `Purchase`: `POST /api/account`

```json
{
  "request_type": "Purchase", "user": "...", "email": "...", "cluster_name": "...",
  "what": "...", "who": "...", "due": "2026-12-01T00:00:00",
  "accounts": ["122809390"], "additional_notes": ""
}
```

The current help-form schema has no option that reaches this endpoint.

### `Acknowledgement`: `POST /api/submit_acknowledgement`

```json
{
  "request_type": "Acknowledgement", "user": "...", "email": "...", "cluster_name": "...",
  "doi": "10.1234/abcd", "additional_info": "...", "timestamp": "..."
}
```

No current frontend component calls this endpoint. The Acknowledgement Form
submits a `Help` request instead.

## Email identity

`get_user_email()` (`views/api/utils.py:194-223`) supplies the `email` field
for every request, the `From` address of the quota fallback email, and the
email shown in the Acknowledgement Form.

1. It looks the user up in `/usr/local/etc/email_mapping.access.login`. The
   file has one entry per line, `#` starts a comment, and lines need at least
   4 colon-separated fields; only the first two are used:
   ```
   # username:email:first:last
   alice:alice.smith@example.edu:Alice:Smith
   ```
2. If the file is missing or has no entry for the user, it returns
   **`<username>@tamu.edu`**. Change the domain, or point the code at your own
   directory lookup (LDAP, `getent`, and so on).

## Login-node SSH

The Python Venv Manager and Quota inspection run commands on `login_node`
(from `config.yml`):

```
ssh -o BatchMode=yes -o ConnectTimeout=5 \
    -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    <login_node> <command>
```

**Requirements:**
- Non-interactive SSH as the user from the OOD web node to `login_node`. TAMU
  uses host-based authentication; user keys also work.
- On the login node, `bash -l` and `/etc/profile` must set up Lmod for the
  venv commands, and `python3`, `nice` and `timeout` must be on `PATH` for
  quota inspection.

**Host keys are not checked.** `StrictHostKeyChecking=no` with
`UserKnownHostsFile=/dev/null` skips host-key verification. If your site has a
managed `ssh_known_hosts`, remove those two options in
`views/api/modules.py:265-273,400-408` and
`views/api/quota_inspection.py:69-77`.

**When quota inspection uses SSH:** only when the OOD host's FQDN contains
`portal` (`quota_inspection.py:51`). Otherwise the scan runs locally on the
OOD node. Change this check to match your hostnames.

Leaving `login_node` empty disables these features. The endpoints return a
"no login node configured" error.

## Announcements

- **Storage:** a single JSON file at `announcements_file` (see
  [`ANNOUNCEMENTS.md`](ANNOUNCEMENTS.md) for the schema). Writes are
  file-locked and atomic, and use revision numbers to catch concurrent edits.
- **Who is an admin:** any user whose PUN can **write** to that file. That
  user gets `can_manage: true` from `/api/announcements` and sees the
  Announcement Manager card. Control access with the file's group: `setup.sh`
  sets it to `hprc` with mode `0664` (directory `2775`), so **change the group
  name for your site**.
- **Timezone:** start and end times without an offset are interpreted as
  `America/Chicago` (`views/api/announcement.py:25` and
  `src/elements/AnnouncementManager.js:80`).

## Group directories

When a group request is submitted, `get_group_directory_info()`
(`views/api/utils.py:226-253`) finds the group's shared directory and owner:

1. It runs `ls -la /scratch/group/` and takes the first line that contains the
   group name.
2. The owner is the third column of that line.
3. If the entry is a symlink, the directory is its target. Otherwise it's
   `/scratch/group/<name>`.

If your group directories live elsewhere, change the path. Failures only
produce a log warning, and the request is still sent.
