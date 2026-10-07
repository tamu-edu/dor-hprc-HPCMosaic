# Widget reference: endpoints, commands, and expected input

This page lists, for each dashboard card, the backend endpoint it calls, the
command that endpoint runs, and the **exact output format the parser
expects**. To support a card at your site, provide a command that prints this
format, or change the parser.

The sample outputs below are **illustrative**: the
TAMU scripts that produce this output are kept in
[`machine-driver-scripts/`](../../machine-driver-scripts/).

All backend commands run as the logged-in user inside their PUN. A non-zero
exit code or unparseable output makes the endpoint return
`{"error": "..."}` with HTTP 500, and the card shows that message.

Contents:
- [CPU Utilization / Jobs Overview](#cpu-utilization--jobs-overview)
- [GPU Resources](#gpu-resources)
- [Nodes Available / Cluster Nodes Overview](#nodes-available--cluster-nodes-overview)
- [System Load](#system-load)
- [My Jobs Summary / User Jobs](#my-jobs-summary--user-jobs)
- [Node Utilization](#node-utilization)
- [Quota cards](#quota-cards)
- [User Groups](#user-groups)
- [Accounts / Project Information](#accounts--project-information)
- [Python Venv Manager](#python-venv-manager)
- [Software Modules](#software-modules)
- [Announcements](#announcements)
- [Getting Started](#getting-started)
- [Acknowledgement Form](#acknowledgement-form)
- [Get Help button (top bar)](#get-help-button-top-bar)
- [Request forms (composer schemas)](#request-forms-composer-schemas)
- [Unused endpoint: `/api/cpuavail`](#unused-endpoint-apicpuavail)

---

## CPU Utilization / Jobs Overview

**Frontend:** `src/elements/KpiCards.js`
**Endpoints:** `GET /api/utilization` (CPU Utilization), `GET /api/jobs/summary` (Jobs Overview)

### `pestat` (site tool, open source)

```
/sw/local/bin/pestat -s alloc,mix,idle          # views/api/jobs.py:729
```

This is Ole Holm Nielsen's [pestat](https://github.com/OleHolmNielsen/Slurm_tools/tree/master/pestat);
any version with the standard column layout works. Each line is split on
whitespace:

| Field index | Meaning | Used as |
|---|---|---|
| `[2]` | Node state; must be `alloc`, `mix` or `idle` (any case) | Node counts |
| `[3]` | CPUs in use (integer) | Summed into allocated cores |
| `[4]` | Total CPUs (integer) | Summed into total cores |

Lines with fewer than 5 fields, any other state, or non-integer CPU values are
skipped, so headers are ignored automatically.

```
Hostname  Partition  Node Num_CPU  CPUload  Memsize  Freemem  Joblist
                     State Use/Tot              (MB)     (MB)  JobID User ...
c001      cpu*       alloc   96  96   95.80   512000   10123  4021 alice
c002      cpu*       mix     48  96   47.10   512000  300000  4022 bob
c003      cpu*       idle     0  96    0.01   512000  500000
```

> pestat prints `Use/Tot` as two whitespace-separated numbers, which is why
> they land in fields `[3]` and `[4]`.

**Plain-Slurm alternative:** `sinfo -h -N -o "%N %T %C"` gives `A/I/O/T` CPU
counts per node. You can wrap it in a small script that prints the columns
above.

### Jobs (standard)

Both endpoints also use the cluster-wide `squeue` snapshot described under
[My Jobs Summary](#my-jobs-summary--user-jobs), filtered to the states
`Running` and `Pending`.

**Response (`/api/utilization`):**
```json
{"nodes": {"allocated": 1, "mixed": 1, "idle": 1},
 "cores": {"allocated": 144, "idle": 144},
 "jobs":  {"running": 812, "pending": 233}}
```

---

## GPU Resources

**Frontend:** `src/elements/KpiCards.js`  **Endpoint:** `GET /api/gpu-resources` (`views/api/info.py:350`)

Standard Slurm, with one naming assumption.

```
sinfo -N -h -o "%N|%T|%P"        # node | state | partition
scontrol show nodes              # CfgTRES, Gres, AllocTRES per node
```

- Only nodes in a partition **named exactly `gpu`** are counted (case-insensitive,
  trailing `*` ignored). This is `GPU_PARTITION` at `views/api/info.py:27`;
  the frontend has a matching check at `src/elements/dashboardUtils.js:179`.
  If your GPU partition has another name, change both.
- GPU totals are read from `CfgTRES` (`gres/gpu=4` or `gres/gpu:a100=4`), or
  from `Gres` (`gpu:a100:4`) if `CfgTRES` has no GPUs. Allocated GPUs come
  from `AllocTRES`. GPU type names don't matter.

---

## Nodes Available / Cluster Nodes Overview

**Frontend:** `src/elements/KpiCards.js`, `src/elements/ClusterStatus.js`
**Endpoints:** `GET /api/nodes`, `GET /api/node/<name>`, `GET /api/node/<name>/jobs`

Standard Slurm.

```
sinfo -N -h -o "%N|%T|%P"                                   # info.py:130
scontrol show node <name>                                   # info.py:430
squeue -w <name> -h -o "%i|%j|%u|%T|%M|%l|%D|%C|%b|%P"      # info.py:454, exactly 10 fields
```

- Node states are normalized by substring: `down`, `drain` and `fail` count
  as down; `maint` and `reserv` as maintenance; then `mix`, `alloc`, `comp`
  and `idle`.
- `scontrol show node` fields used: `NodeName, State, Partitions, CPUAlloc,
  CPUTot, CPULoad, RealMemory, AllocMem, FreeMem, Gres, AvailableFeatures,
  ActiveFeatures, Arch, Sockets, CoresPerSocket, ThreadsPerCore, BootTime,
  SlurmdStartTime, Version, Reason, ReasonUid, ReasonTime, CfgTRES, AllocTRES`.
- **Site assumption:** nodes in a partition named `staff` are left out of the
  Nodes Available count (`src/elements/KpiCards.js:27`), and a `STAFF` filter
  chip is hidden (`src/elements/ClusterStatus.js:22`).

---

## System Load

**Frontend:** `src/elements/KpiCards.js`  **Endpoint:** `GET /api/system-load`

Python's `os.getloadavg()` and `os.cpu_count()`. Because the backend runs on
the OOD web node, this card shows **the web node's load**, not the cluster's.

---

## My Jobs Summary / User Jobs

**Frontend:** `src/elements/MyJobsCard.js`, `src/elements/JobDetailsShared.js`, `src/elements/UserJobs.js`
**Endpoints:** `/api/jobs`, `/api/jobs/past_jobs`, `/api/jobs/<id>`, `/api/jobs/<id>/jobstats`, `/api/cancel_job/<id>`, `/api/priority/queue-insight`

Standard Slurm. All formats are `|`-delimited, so they work on any recent
Slurm version.

| Command | Where |
|---|---|
| `squeue --noheader --format=%i\|%j\|%u\|%a\|%P\|%t\|%D\|%C\|%b\|%M\|%l\|%V\|%R\|%Q` | `views/api/jobs.py:394`. Runs for all users; cached 10 s. |
| `sacct --noheader --parsable2 --starttime=now-<N>days --format=<33 fields>` | `views/api/jobs.py:426`. Needs slurmdbd. Windows of 1, 7, 14 or 30 days. |
| `scontrol show job -o <id>` | `views/api/slurm_jobs.py:25` |
| `scancel <id>` | `views/api/jobs.py:708` |
| `sprio --noheader --jobs <id> --format=%i\|%Y\|%A\|%B\|%F\|%J\|%P\|%Q\|%N` | `views/api/priority.py:101`. Needs the multifactor priority plugin; skipped if unavailable. |
| `squeue --noheader --start --jobs <id> --format=%i\|%S\|%Y\|%R` | `views/api/priority.py:127` |
| `squeue --noheader --partition <p> --states=PENDING,RUNNING --format=%i\|%u\|%a\|%P\|%t\|%D\|%C\|%b\|%V\|%Q\|%R` | `views/api/priority.py:48` |
| `sinfo --noheader --partition <p> --format=%C` | `views/api/priority.py:273` |

### Optional: jobstats charts

`GET /api/jobs/<id>/jobstats` (`views/api/jobstats.py`) draws CPU, memory, GPU
and I/O charts if the job's working directory (from
`sacct --format=JobIDRaw,User,WorkDir,ElapsedRaw`) contains any of these
files:

```
stats_cpu.<jobid>.log[.gz]
stats_gpu.<jobid>.log[.gz]
stats_io.<jobid>.log[.gz]
```

If none exist, the response is `{"available": false}` and the charts are
hidden. Files over 50 MB are ignored.

- **`stats_cpu`**: optional header lines `CPU_MEM_TOTAL: <kB>` and
  `CPUS_ON_NODE: <n>`, then `vmstat`-style rows of at least 17 numeric
  columns. Used: `[3]` free memory kB, `[5]` cache kB, `[12]` user CPU %.
  Memory used = total − free − cache.
- **`stats_gpu`**: CSV from
  `nvidia-smi --query-gpu=timestamp,index,utilization.gpu,memory.used,memory.total --format=csv`.
  Columns are read by header name: `index`, `utilization.gpu [%]`,
  `memory.used [MiB]`, `memory.total [MiB]`, `timestamp`.
- **`stats_io`**: rows of exactly 4 integers. `[1]` is cumulative sectors
  read and `[3]` cumulative sectors written (×512 bytes), relative to the
  first row.

Samples are assumed to be evenly spaced over the job's elapsed time
(`ElapsedRaw`).

---

## Node Utilization

**Frontend:** `src/elements/ClusterInfo.js`  **Endpoint:** `GET /api/sinfo`

### `retrieve_sinfo` (site tool)

```
/sw/local/bin/retrieve_sinfo                    # views/api/info.py:229
```

stdout must be **one Python or JSON literal**: a list with one object per
queue (partition). It is parsed with `ast.literal_eval`. JSON `true`, `false`
and `null` are **not** accepted; use numbers and strings only. All values are
displayed or passed through `parseInt`, so strings are fine:

| Key | Meaning |
|---|---|
| `queue` | Partition name shown in the table |
| `CPU_total`, `CPU_avail` | CPU totals; the bar shows (total − avail) / total |
| `nodes_total`, `nodes_avail` | Node totals; same calculation |
| `job_size` | Tooltip text: "Can request {job_size} nodes/cores." |
| `time_limit` | Tooltip text: "Up to {time_limit} runtime limit." |

```python
[{"queue": "cpu", "CPU_total": "9216", "CPU_avail": "1210",
  "nodes_total": "96", "nodes_avail": "8", "job_size": "1-64 nodes", "time_limit": "7-00:00:00"},
 {"queue": "gpu", "CPU_total": "3072", "CPU_avail": "640",
  "nodes_total": "32", "nodes_avail": "4", "job_size": "1-8 nodes", "time_limit": "2-00:00:00"}]
```

**Plain-Slurm alternative:** generate the same structure from
`sinfo -h -o "%P|%C|%F|%s|%l"`. `%C` gives CPUs as A/I/O/T and `%F` gives
nodes as A/I/O/T.

---

## Quota cards

Applies to **My Quotas Summary** (`src/elements/SummaryCards.js`) and
**Quota Information** (`src/elements/QuotaInfo.js`).
**Endpoints:** `GET /api/showquota`, `POST /api/quota` (request form), `POST /api/quota/inspection` (find large directories)

### `showquota` (site tool)

```
/sw/local/bin/showquota          # views/api/info.py:244, views/api/quota_inspection.py:32
```

Parsing (`views/api/info.py:246-318`):

- **The first 2 lines are skipped** as headers.
- A **data row** is split on whitespace and needs at least 5 fields. Only
  rows whose first field starts with `/` are kept:

  | Field | Meaning | Format |
  |---|---|---|
  | `[0]` | Absolute directory path | `/scratch/user/alice` |
  | `[1]` | Disk used | number + optional `K M G T P E` suffix, e.g. `1.2T`, `512G`, `0` |
  | `[2]` | Disk limit | same |
  | `[3]` | Files used | integer |
  | `[4]` | File limit | integer |
  | `[5:]` | Anything else | shown as "additional info" |

  A trailing `*` on a used value marks it over quota. The backend also flags
  over-quota when used > limit.
- An **expiry line** attaches a date to an earlier row with the same path.
  Accepted date formats are `Mar 05, 2026`, `March 05, 2026` and `2026-03-05`:
  ```
  * Quota increase for '/scratch/user/alice' will expire on Mar 05, 2026
  ```

```
Your current disk quotas are:
Disk                      Disk Usage      Limit    File Usage      Limit
/home/alice                    7.2G       10G          9213      10000
/scratch/user/alice            1.2T        2T        201331     500000
/scratch/group/labx           18.4T*       15T       2003001    5000000   project space
* Quota increase for '/scratch/group/labx' will expire on Mar 05, 2026
```

**Frontend assumptions:**
- Any path containing `/home` is treated as not expandable, so the request
  button is hidden. See `QuotaInfo.js:172` and `SummaryCards.js:88`.
- For paths under `/home/`, the inspection dialog shows a tip linking to a
  TAMU FAQ (`QuotaInspectionButton.js:9,41`).

### Quota inspection (find large directories)

`POST /api/quota/inspection` runs the bundled, portable
`views/api/quota_usage_scan.py`. It is limited to 30 s and 250,000 entries,
and results are cached for 5 minutes. Only paths that `showquota` reports for
the user can be scanned.

- If the OOD host's FQDN **contains `portal`** (`quota_inspection.py:51`), the
  script is piped over SSH to `login_node` and run with `python3 -`. The login
  node needs `python3`, `nice` and `timeout`. See
  [integrations.md](integrations.md#login-node-ssh).
- Otherwise it runs locally.

### Quota request

`POST /api/quota` sends the form to the support webhook, and falls back to
email if the webhook fails. For the payload, see
[integrations.md](integrations.md#support-request-webhook). For the form
fields and TAMU policy, see [Request forms](#request-forms-composer-schemas).

---

## User Groups

**Frontend:** `src/elements/UserGroups.js`, `src/elements/GroupButton.js`
**Endpoints:** `GET /api/groups`, `GET /api/showquota`, `POST /api/group`

- `/api/groups` runs `groups` and splits the output on whitespace. Standard.
- Group directories are matched against `showquota` output (above).
- `POST /api/group` (create a group, add or remove members, request access)
  goes to the support webhook. Before sending, the backend looks up the
  group's directory and owner by parsing `ls -la /scratch/group/`, following
  symlinks (`views/api/utils.py:226-253`). If that directory doesn't exist the
  request is still sent, with the default path `/scratch/group/<name>`.

---

## Accounts / Project Information

**Frontend:** `src/elements/SummaryCards.js` (Accounts), `src/elements/Accounts.js` (Project Information)
**Endpoints:** `GET /api/projectinfo[?account=X&pending_jobs=1|&job_history=1]`, `POST /api/set_default_account`

These cards are built around TAMU's allocation model: accounts with a
**service-unit (SU)** allocation per **fiscal year**, and one default account.

### `myproject` (site tool)

`views/api/projects.py`. The account value must match
`^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$`; anything else gets HTTP 400.

**`myproject`** (no arguments): list accounts (`projects.py:16-39`).
- Parsing starts at the line containing `|  Account` (pipe, **two spaces**,
  `Account`). The next line is skipped as a separator.
- Each row after that has the form `| a | b | ... |` and must have exactly
  **7 cells**:

| Cell | Key | Notes |
|---|---|---|
| 1 | `account` | Account ID |
| 2 | `fy` | Fiscal year |
| 3 | `default` | `Y` marks the default account |
| 4 | `allocation` | Number (SUs) |
| 5 | `used_pending_sus` | Number |
| 6 | `balance` | Number |
| 7 | `pi` | PI name |

```
=====================================================================================
                    List of alice's Project Accounts
-------------------------------------------------------------------------------------
|  Account   |  FY  | Default | Allocation | Used & Pending SUs | Balance  |  PI     |
-------------------------------------------------------------------------------------
| 122809390  | 2026 |    Y    |   5000.00  |        1234.50     |  3765.50 | Smith J |
| 122809391  | 2026 |    N    |  20000.00  |           0.00     | 20000.00 | Doe R   |
-------------------------------------------------------------------------------------
```

**`myproject -p <account>`**: pending jobs (`projects.py:41-55`). The first 2
lines are skipped. Rows with exactly **5 cells**:
`| job_id | state | cores | effective_cores | walltime_hours |`.

**`myproject -j <account>`**: job history (`projects.py:58-80`).
- Parsing starts after the line containing both `JobID` and `SubmitTime`.
- Each row is split on `|`, and empty cells are dropped. Rows with at least
  **9** non-empty cells are kept.
- Indices used: `[1]` job ID, `[3]` submit time, `[4]` start, `[5]` end,
  `[6]` walltime, `[7]` total slots, `[8]` SUs used. Cells `[0]` and `[2]` are
  ignored, for example a row number and the user.

**`myproject -d <account>`**: set the default account. Only the exit code
matters; on failure, stderr (or stdout) is shown to the user.

**Plain-Slurm alternative:** account lists can come from
`sacctmgr -nP show assoc user=$USER format=account` and
`sshare -nP -U -u $USER`. SU allocations and balances depend on how your site
does accounting, so there is no direct Slurm equivalent.

---

## Python Venv Manager

**Frontend:** `src/elements/PyVenvManager.js`, `src/elements/CreateVenvForm.js`
**Endpoints:** `GET /api/get_env`, `GET /api/get_py_versions`, `POST /api/create_venv`, `DELETE /api/delete_env/<name>`

Built on **ModuLair**, TAMU HPRC's virtual-environment manager. All four
commands are site tools.

`get_env` and `create_venv` run on `login_node` over SSH. If `login_node` is
empty, they return HTTP 503 ("No internal login node is configured").

### `modulair list` (over SSH)

```
ssh <login_node> bash -l -c 'source /etc/profile >/dev/null 2>&1 && nice -n 15 modulair list'
```

Parser: `views/api/modules.py:35-121`. ANSI color codes are stripped. It
recognizes these lines:

| Line | Effect |
|---|---|
| `These are your virtual environments in group '<grp>'` | Following entries belong to group `<grp>` |
| Any line containing `virtual environments in your $SCRATCH` | Following entries are personal (no group) |
| `<N>. <name>` | Starts a new environment |
| Unlabeled text before the `Python:` line | Description (multiple lines are joined) |
| `Python: <ver> \| GCC: <ver>` | Python and GCCcore versions |
| `Description: ...`, `Toolchain: ...`, `Owner: ...` | Labeled fields; continuation lines are appended |
| Line starting `For example,` or `If you loaded` | Ends the current entry |

If no entries were parsed and the output doesn't contain
`no virtual environments`, the endpoint returns HTTP 502.

```
These are your virtual environments in your $SCRATCH directory:
1. torch-env
   PyTorch 2.1 for my thesis
   Python: 3.11.3 | GCC: 12.3.0
2. plotting
   Python: 3.10.4 | GCC: 11.3.0
These are your virtual environments in group 'labx'
1. shared-env
   Python: 3.11.3 | GCC: 12.3.0
   Owner: bob
For example, to activate an environment run: ...
```

### `toolchains` (local)

```
/sw/local/bin/toolchains          # views/api/modules.py:337
```

- Only lines containing the text `Python` are considered, and **the first
  such line is skipped** as a header.
- Each remaining line is split on whitespace. `[2]` must be a **loadable GCC
  module name** and `[6]` a **loadable Python module name**.
- The endpoint returns `{"<python module>": "<gcc module>", ...}`. The first
  occurrence of each Python version wins.

```
Toolchain  Year  GCCcore           ...  ...  ...  Python
foss       2023a GCCcore/12.3.0    ...  ...  ...  Python/3.11.3
foss       2022b GCCcore/12.2.0    ...  ...  ...  Python/3.10.8
```

### `create_venv` (over SSH)

```
ssh <login_node> bash -l -c 'source /etc/profile && module load <gcc> <python> && /sw/local/bin/create_venv <name> -d <description>'
```

The `module load` arguments are the two module names from `toolchains`. All
values are shell-quoted. Only the exit code matters; stderr is shown on
failure.

### `delete_venv` (local)

```
/sw/local/bin/delete_venv <name>          # views/api/modules.py:324, stdin "y\n"
```

`$SCRATCH` defaults to `/scratch/user/$USER` if unset (`modules.py:321`).
stdout is shown to the user. **The exit code is not checked.**

---

## Software Modules

**Frontend:** `src/elements/SoftwareModulesPage.js` and children
**Endpoints:** `GET /api/available_modules/summary`, `GET /api/available_modules/details`

The card reads a static JSON file:

```
<app root>/modules/<cluster_name lower-cased>-modules.json
```

`cluster_name` must match `[a-z0-9_-]+`. The `modules/` directory is
git-ignored, and the repo has no generator. Build the file from your module
tree (for example from Lmod `spider` output) and refresh it when your software
changes. It's re-read whenever its modification time changes.

Format: a JSON array with one record per module version.

| Key | Type | Notes |
|---|---|---|
| `name` | string | Required |
| `version` | string | Required. Versions are sorted numerically; the highest is "latest". |
| `full_name` | string | Required. `name/version`, used for `module load`. |
| `description` | string | Optional |
| `is_default` | bool | Optional |
| `is_extension` | bool | `true` for Python/R packages provided inside another module |
| `dependencies` | array of arrays of strings | Each inner array is one set of modules to load first. For extensions, the first set becomes the load command. The compiler shown is the first dependency matching `AOCC/`, `Clang/`, `GCC/`, `GCCcore/`, `intel/` or `NVHPC/` (`modules.py:22`). |

```json
[
  {"name": "GROMACS", "version": "2023.3", "full_name": "GROMACS/2023.3",
   "description": "Molecular dynamics package.", "is_default": true,
   "is_extension": false, "dependencies": [["GCC/12.3.0", "OpenMPI/4.1.5"]]},
  {"name": "numpy", "version": "1.25.1", "full_name": "numpy/1.25.1",
   "description": "", "is_extension": true,
   "dependencies": [["GCC/12.3.0", "SciPy-bundle/2023.07"]]}
]
```

---

## Announcements

**Frontend:** `SummaryCards.js` (Announcements Summary), `AnnouncementManager.js` (admins only)
**Endpoints:** `GET /api/announcements`, `/api/admin/announcements*`

These only need the JSON file at `announcements_file`. For the file format and
admin workflow, see [`ANNOUNCEMENTS.md`](../../ANNOUNCEMENTS.md), and see
[integrations.md](integrations.md#announcements) for how admins are
identified. Local times are interpreted as `America/Chicago`
(`views/api/announcement.py:25`, `src/elements/AnnouncementManager.js:80`).

---

## Getting Started

**Frontend:** `src/elements/SummaryCards.js:560-620`. There is no backend.

The card contains a fixed list of links to `hprc.tamu.edu` user guides, the
knowledge base and a YouTube channel, plus a per-cluster guide link keyed by
`aces`, `grace`, `faster` and `launch`. Replace these with your own
documentation links, or remove the card from `CardConfig.js` and
`DefaultLayout.js`.

---

## Acknowledgement Form

**Frontend:** `src/elements/AcknowledgementForm.js`
**Endpoints:** `GET /api/user-data`, `POST /api/help`

- `/api/user-data` returns `{user, email}`. The email comes from the mapping
  file (see [integrations.md](integrations.md#email-identity)).
- The form submits through the Help request (`help_topic: "Other"`).
- The wording, the citation link (`hprc.tamu.edu/research/citations.html`) and
  the ACCESS branch for `aces` and `launch` are TAMU-specific
  (`AcknowledgementForm.js:16,107-130`).

---

## Get Help button (top bar)

**Frontend:** `src/elements/HelpButton.js`
**Endpoints:** `POST /api/help`, `POST /api/software`, `POST /api/account`

All three go to the support webhook. For payloads, see
[integrations.md](integrations.md#support-request-webhook). The Accounts
sub-options (add a user to an account, transfer SUs) follow TAMU's allocation
model.

---

## Request forms (composer schemas)

The quota, group, help and acknowledgement popups are rendered from JSON
schemas:

```
src/composer/schemas/requests/<profile>/<form>.json
```

- `<profile>` is `cluster_name` in lower case. If that folder has no file for
  the form, `default/` is used (`src/composer/schemas/requestProfile.js`).
  Existing profiles are `default/` (TAMU Grace and FASTER), `aces/` and
  `launch/`.
- **For your site:** create `requests/<your cluster>/` and copy in the forms
  you want to change. No code change is needed.
- Field types and conditional display are described in `CODEBASE_OVERVIEW.md`
  §6. Field names become the form fields posted to the backend, so keep the
  names the backend reads (listed in
  [integrations.md](integrations.md#support-request-webhook)).

**TAMU policy in the defaults:**
- `default/quotaRequest.json` requires a paid **buy-in** for requests over
  10 TB or longer than 6 months, and only a PI can make them. It also links to
  TAMU's storage pricing page.
- `src/elements/QuotaButton.js` repeats the 10 TB / 6-month rule and
  "approval from the HPRC Director" in its alerts and disclaimer text
  (`:21`, `:47-53`, `:175-176`). The logic is keyed to schema field values,
  not numbers:
  - `isLongRequest = Yes` with `isPIRequest = No` is always blocked.
  - `isBuyRequest = No` is blocked only when the schema defines an
    `isBuyRequest` field.

  If your schema leaves out these fields, the checks never trigger, but the
  disclaimer text still mentions 10 TB.
- `default/groupRequest.json` says "NetID" (TAMU's term for a username) and
  limits group names to 14 characters.
- `aces/` and `launch/` only allow requesting access to an existing group.

---

## Unused endpoint: `/api/cpuavail`

`views/api/info.py:476` runs `/sw/local/bin/cpuavail`. No current card calls
it, so you can ignore it. Its format is documented here for completeness:

- A line containing `CONFIGURATION`; from 3 lines later until 1 line before
  the `AVAILABILITY` line, rows of `<node_type> <count>`.
- A line containing `AVAILABILITY`; from 3 lines later, rows of
  `<node> <cpus_available:int> <memory_available:int>`.
