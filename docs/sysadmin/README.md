# HPCMosaic deployment guide for HPC administrators

HPCMosaic was built for the Texas A&M HPRC clusters (ACES, Grace, FASTER,
Launch). Much of it is plain Slurm and works anywhere. Several widgets read
from TAMU-specific scripts or services. This guide tells you which widgets
those are and what input each one expects, so you can provide your own
equivalents, edit the code, or hide the widget.

| Document | Contents |
|---|---|
| This page | Requirements, install, `config.yml`, dependency matrix, site checklist |
| [widgets.md](widgets.md) | Per widget: endpoints, commands run, and the exact output format each parser expects |
| [integrations.md](integrations.md) | Support-request webhook payloads, email, login-node SSH, announcements, group directories |
| [../../machine-driver-scripts/](../../machine-driver-scripts/) | List of the TAMU site scripts the backend calls (not published) |

## How it works

- HPCMosaic is an OOD **Passenger app**: a Flask backend (`app.py`,
  `views/api/`) plus a React single-page frontend that webpack bundles to
  `static/bundle.js`.
- Each user gets their own process (PUN) **running as that user**. The backend
  identifies the user from `$USER` and runs Slurm commands and site tools with
  that user's permissions. There is no login layer and no database.
- Every widget calls `<app URL>/api/...` on the backend, and the backend shells
  out to a command. If a command is missing or prints something unexpected,
  that widget shows an error. The rest of the dashboard keeps working.
- User layouts and preferences are stored in `~/.HPCMosaic/`. Set
  `$HPCMOSAIC_DATA_DIR` to store them somewhere else.

## Requirements

| Requirement | Notes |
|---|---|
| Open OnDemand with Passenger apps | Install under `/var/www/ood/apps/sys/<name>` (production) or a user's `~/ondemand/dev/<name>` (sandbox) |
| Python 3 on the OOD web node | `requirements.txt` pins Flask 2.0.3 for compatibility with older system Pythons. On Python < 3.9 you also need `backports.zoneinfo`. |
| Node.js and npm on the build host | Only to build the frontend (`npm run build`) |
| Slurm client commands on the OOD web node | `sinfo`, `squeue`, `scontrol`, `scancel`, `sacct` (needs slurmdbd), and `sprio` (multifactor priority; optional) |
| *Optional:* passwordless SSH from the OOD web node to a login node | Needed by Python Venv Manager and Quota inspection. See [integrations.md](integrations.md#login-node-ssh). |
| *Optional:* Lmod | For Software Modules and Python Venv Manager |
| *Optional:* site scripts | See the matrix below |

## Install

```bash
cd /var/www/ood/apps/sys            # or ~/ondemand/dev for a sandbox
git clone https://github.com/tamu-edu/dor-hprc-HPCMosaic.git hpcmosaic
cd hpcmosaic
./setup.sh
```

`setup.sh` does the following:

1. Asks for the **cluster name** (env var `CLUSTERNAME`) and the **internal
   login node** (env var `LOGIN_NODE`). The ACES-only default for the login
   node can be ignored.
2. Asks for `dev` or `prod`. This only changes the app title suffix in
   `manifest.yml`.
3. Generates `config.yml` and `manifest.yml` from the `*.template` files with
   `envsubst`. Both are git-ignored.
4. Creates `var/announcements/announcements.json` owned by group **`hprc`**
   (`setup.sh:90,99`). **Change `hprc` to your own admin group before running
   the script.** With `set -e`, the script stops at that line if the group
   doesn't exist. Members of this group can manage announcements; see
   [integrations.md](integrations.md#announcements).
5. Creates `.venv`, runs `pip install -r requirements.txt`, then
   `npm install` and `npm run build`.

When you change backend code, restart the PUN (OOD portal → Help → Restart Web
Server, or `touch tmp/restart.txt`). When you change frontend code **or
`config.yml`**, run `npm run build`.

## `config.yml` reference

`config.yml` has a `development:` block and a `production:` block that inherits
from it. Edit `config.yml.template` and re-run `setup.sh`, or edit `config.yml`
directly.

| Key | TAMU value in the template | Read by | What to set |
|---|---|---|---|
| `cluster_name` | prompted | Banner title, module catalog file name, request-form profile, `cluster_name` field in support requests | Your cluster's name |
| `login_node` | prompted | Venv Manager, Quota inspection (over SSH) | Internal hostname reachable over SSH from the OOD node, or empty to disable those features |
| `announcements_file` | `var/announcements/announcements.json` (dev), `/var/www/ood/apps/sys/${APPNAME}/var/announcements/announcements.json` (prod) | Announcements | Usually leave as is |
| `dashboard_url` | `/pun/dev/${APPNAME}` / `/pun/sys/${APPNAME}` | Acknowledgement form, dev-only diagnostics | Leave as is |
| `file_app_url`, `file_editor_url` | `/pun/sys/files/fs`, `/pun/sys/file-editor/edit` | Templates | Standard OOD paths |
| `home_page` | `https://hprc.tamu.edu` | Not currently read | Your site |
| `request_email` | `help@hprc.tamu.edu` | Recipient of quota-request email when the webhook fails | Your helpdesk address |
| `help_email` | `help@hprc.tamu.edu` | Shown in backend error messages | Your helpdesk address |
| `hprcbot_route` | `http://courant.hprc.tamu.edu:8553` | Base URL for all support-request forms | Your receiver, or leave it and hide the request buttons. See [integrations.md](integrations.md#support-request-webhook). |
| `dashboard_fonts` | font list | Settings menu | Optional |

Two known quirks:

- **The backend reads both blocks.** `app.py` chooses `development` or
  `production` from the app path, or from `RACK_ENV` if set. But
  `views/api/config.py` always reads `development`, and it supplies
  `cluster_name`, `request_email`, `help_email` and `hprcbot_route` to the
  support-request routes. Put the same values in both blocks.
- **The frontend bakes the config in at build time.** It imports `config.yml`
  through webpack, so run `npm run build` after any change.

## Dependency matrix

"Standard" means only stock Slurm or Linux is needed. "Site" means the widget
needs a TAMU script or service, or the equivalent at your site. Card names are
the names in the "Add Element" drawer (`src/framework/CardConfig.js`).

| Card | Endpoints | Needs | Type | Without it |
|---|---|---|---|---|
| [CPU Utilization](widgets.md#cpu-utilization--jobs-overview) | `/api/utilization` | `pestat`, `squeue` | Site (pestat is open source) | Card shows an error |
| [Jobs Overview](widgets.md#cpu-utilization--jobs-overview) | `/api/jobs/summary` | `squeue` | Standard | — |
| [GPU Resources](widgets.md#gpu-resources) | `/api/gpu-resources` | `sinfo`, `scontrol`; a partition named **`gpu`** | Standard plus a naming assumption | Shows 0 GPUs |
| [Nodes Available](widgets.md#nodes-available--cluster-nodes-overview) | `/api/nodes` | `sinfo` | Standard (hides a `staff` partition) | — |
| [System Load](widgets.md#system-load) | `/api/system-load` | `os.getloadavg()` | Standard | Reports load on the **OOD web node**, not the cluster |
| [My Jobs Summary](widgets.md#my-jobs-summary--user-jobs) | `/api/jobs`, `/jobs/past_jobs`, `/jobs/<id>`, `/jobs/<id>/jobstats`, `/cancel_job/<id>`, `/priority/queue-insight` | `squeue`, `sacct`, `scontrol`, `scancel`, `sprio`, `sinfo`; optional jobstats logs | Standard (jobstats optional) | Job charts hidden when jobstats logs are absent |
| [User Jobs](widgets.md#my-jobs-summary--user-jobs) | `/api/jobs`, `/cancel_job/<id>` | `squeue`, `scancel` | Standard | — |
| [Cluster Nodes Overview](widgets.md#nodes-available--cluster-nodes-overview) | `/api/nodes`, `/node/<n>`, `/node/<n>/jobs` | `sinfo`, `scontrol`, `squeue` | Standard (hides a `STAFF` partition chip) | — |
| [Node Utilization](widgets.md#node-utilization) | `/api/sinfo` | `/sw/local/bin/retrieve_sinfo` ([included](../../machine-driver-scripts/retrieve_sinfo); plain `sinfo`) | Standard, with the included script | Card shows an error |
| [My Quotas Summary](widgets.md#quota-cards) | `/api/showquota`, `/quota`, `/quota/inspection` | `/sw/local/bin/showquota` ([generic version included](../../machine-driver-scripts/showquota.generic); Lustre); SSH for inspection; support webhook | Site | Card shows an error |
| [Quota Information](widgets.md#quota-cards) | `/api/showquota`, `/quota` | `showquota`; support webhook | Site | Card shows an error |
| [User Groups](widgets.md#user-groups) | `/api/groups`, `/showquota`, `/group` | `groups`; `showquota`; `/scratch/group/`; support webhook | Mixed | Group list works; requests fail |
| [Accounts](widgets.md#accounts--project-information) | `/api/projectinfo`, `/set_default_account` | `/sw/local/bin/myproject` (not published; TAMU-specific) | Site | Card shows an error; remove the card |
| [Project Information](widgets.md#accounts--project-information) | same | `myproject` (not published) | Site | Card shows an error; remove the card |
| [Python Venv Manager](widgets.md#python-venv-manager) | `/api/get_env`, `/create_venv`, `/delete_env/<n>`, `/get_py_versions` | `modulair`, `create_venv`, `delete_venv` ([ModuLair](https://github.com/tamu-edu/dor-hprc-venv-manager), open source); `toolchains`; SSH; Lmod | Site (mostly open source) | Card shows an error |
| [Software Modules](widgets.md#software-modules) | `/api/available_modules/summary`, `/available_modules/details` | `modules/<cluster>-modules.json` | Site-generated file | "No modules catalog" error |
| [Announcements Summary](widgets.md#announcements) | `/api/announcements` | `announcements.json` | Standard | Empty list |
| [Announcement Manager](widgets.md#announcements) (admins only) | `/api/admin/announcements*` | Write access to `announcements.json` | Standard | Hidden from non-admins |
| [Getting Started](widgets.md#getting-started) | — | Hardcoded `hprc.tamu.edu` links | Site content | Links point to TAMU |
| [Acknowledgement Form](widgets.md#acknowledgement-form) | `/api/user-data`, `/help` | email mapping; support webhook | Site | Submission fails |
| [Get Help button](widgets.md#get-help-button-top-bar) (top bar) | `/api/help`, `/software`, `/account` | Support webhook | Site | Submission fails |

A user can remove any card from their layout. To stop offering a card at all,
delete its entry from `src/framework/CardConfig.js` (and from
`src/framework/DefaultLayout.js` if it's in the default layout), then rebuild.

## Making it work at your site: checklist

Each item lists the exact code to change. Line numbers are as of v1.0.0.

**Site scripts** (install the ones in [`machine-driver-scripts/`](../../machine-driver-scripts/), provide an equivalent at the same path, change the path, or hide the card):
- [ ] `/sw/local/bin/showquota`: `views/api/info.py:244`, `views/api/quota_inspection.py:32`
- [ ] `/sw/local/bin/myproject`: `views/api/projects.py:11` (`MYPROJECT`)
- [ ] `/sw/local/bin/pestat`: `views/api/jobs.py:729`
- [ ] `/sw/local/bin/retrieve_sinfo`: `views/api/info.py:229`
- [ ] `/sw/local/bin/toolchains`, `create_venv`, `delete_venv`, and `modulair`: `views/api/modules.py:262,324,337,389`
- [ ] `modules/<cluster>-modules.json`: generate it (see [widgets.md](widgets.md#software-modules))

**Cluster layout and policy:**
- [ ] GPU partition name `gpu`: `views/api/info.py:27` (`GPU_PARTITION`) and `src/elements/dashboardUtils.js:179`
- [ ] Hidden `staff` partition: `src/elements/KpiCards.js:27`, `src/elements/ClusterStatus.js:22`
- [ ] "`/home` is not expandable" rule (hides the quota-request button): `src/elements/QuotaInfo.js:172`, `src/elements/SummaryCards.js:88`, `src/elements/QuotaInspectionButton.js:41`
- [ ] Group directory root `/scratch/group/`: `views/api/utils.py:231-248`
- [ ] Venv `$SCRATCH` default `/scratch/user/$USER`: `views/api/modules.py:321`
- [ ] Quota-request policy (10 TB / 6-month buy-in): request schemas and `src/elements/QuotaButton.js` (see [widgets.md](widgets.md#request-forms-composer-schemas))

**Services and identity:**
- [ ] Email fallback `<user>@tamu.edu` and mapping file: `views/api/utils.py:194-223`
- [ ] SMTP host `smtp.tamu.edu:25`: `views/api/bot_requests.py:124`
- [ ] Support webhook: `hprcbot_route` in `config.yml`, path suffix `/HPRCapp/OOD` in `views/api/bot_requests.py:27`
- [ ] "Is this the portal host?" check (`"portal"` in the FQDN): `views/api/quota_inspection.py:51`
- [ ] Announcement timezone `America/Chicago`: `views/api/announcement.py:25`, `src/elements/AnnouncementManager.js:80`
- [ ] Announcement admin group `hprc`: `setup.sh:90,99`

**Text and links:**
- [ ] Getting Started links: `src/elements/SummaryCards.js:560-620`
- [ ] Footer (institution, help email, feedback form): `src/framework/Banner.js:738-746`
- [ ] Acknowledgement wording and citation link: `src/elements/AcknowledgementForm.js:107-130`
- [ ] Quota FAQ link: `src/elements/QuotaInspectionButton.js:9`
- [ ] Page title: `templates/index.html:5`

## Known limitations

- The dashboard assumes Slurm. No other scheduler is supported.
- Site-specific values are set in code, not configuration. Expect to keep a
  small local patch against upstream.
- `/api/jobs/summary` and `/api/utilization` run `squeue` for **all** users,
  cached for 10-20 s per PUN. On very large clusters, watch the load on
  slurmctld.
- `Node Utilization` reads `sinfo` through a separate script
  (`retrieve_sinfo`, included) rather than calling it directly.
- The Accounts and Project Information cards need TAMU's unpublished
  `myproject` and have no generic replacement.
- `System Load` shows the OOD web node's load average.
- Several frontend components read `config.production.cluster_name`
  directly. `src/composer/schemas/requestProfile.js` notes that the YAML loader
  may leave production values under a literal `<<` key. If so, those components
  see no cluster name: the ACCESS acknowledgement text never shows, and forms
  post `cluster_name: "default"`. The webhook payload is unaffected because the
  backend fills in `cluster_name` from `config.yml` itself.
- Login-node SSH uses `StrictHostKeyChecking=no`. See
  [integrations.md](integrations.md#login-node-ssh).
