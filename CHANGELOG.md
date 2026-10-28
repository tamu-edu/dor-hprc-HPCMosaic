# Changelog

All notable changes to HPCMosaic are documented here. This project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

Fixes from the Appverse automated review, and a generator for the Software
Modules catalog.

### Added
- Site tool paths are configurable under `tools:` in `config.yml`
  (`showquota`, `myproject`, `pestat`, `retrieve_sinfo`, `cpuavail`,
  `toolchains`, `delete_venv`, `create_venv`, `modulair`). Unset tools keep
  their previous `/sw/local/bin` defaults, so existing deployments need no
  config change.
- `smtp_host` and `smtp_port` in `config.yml` for the quota-request email
  fallback (default `smtp.tamu.edu:25`, as before).
- `machine-driver-scripts/generate_module_catalog.py` and a matching
  `.sbatch` job build the Software Modules catalog
  (`modules/<cluster>-modules.json`) from Lmod. The file is named from
  `cluster_name` in `config.yml`, falling back to `SLURM_CLUSTER_NAME`, and
  is replaced in one step so the dashboard never reads a partial catalog.
  `setup.sh` creates `modules/` and, if the catalog is missing, prints the
  command to build it.

### Changed
- The license file is now `LICENSE` (was `LICENSE.md`).
- `python app.py` no longer enables the Werkzeug debugger by default; set
  `FLASK_DEBUG=1` to opt in. It binds to `127.0.0.1`. Passenger deployments
  are unaffected.
- `retrieve_sinfo`, `showquota` and `cpuavail` are run without a shell.
- The announcements lock file is created `0660` (was `0664`); the
  announcements file stays `0664` so all users can read it and all admins can
  write it.
- Chatbot backend: defaults to `127.0.0.1` instead of `0.0.0.0` when run
  directly, logs only method, path and status (no headers or bodies), and
  times out Pryon API requests (10 s connect, 60 s between streamed chunks).

### Removed
- CORS from the dashboard and the chatbot backend (both are same-origin), and
  the `Flask-Cors` dependency.
- Unused code: `run_command()` in `views/api/utils.py`,
  `views/HPRCBot_request_handler.py`, and the legacy templates `layout.html`,
  `layout_no_banner.html`, `test.html`, `config.html` and
  `index_no_banner.html` (which loaded scripts from CDNs).

## [1.0.0] - 2026-10-12

First tagged release, prepared for the Open OnDemand Appverse.

### Added
- Sysadmin documentation in `docs/sysadmin/`: deployment guide, per-widget
  input contracts, and external integrations (support webhook, email, SSH).
- `machine-driver-scripts/` listing the site tools the backend calls.
- `appverse.yml` catalog metadata.

### Changed
- `config.yml` and `manifest.yml` are no longer tracked; `setup.sh` generates
  them from the `.template` files.
  **Existing deployments:** pulling this change deletes your working copies of
  these files. Back them up first, or re-run `./setup.sh` after pulling.
- `/api/projectinfo` and `/api/set_default_account` run `myproject` without a
  shell and reject account values that aren't alphanumeric (plus `_ . -`).
- `/api/sinfo` parses `retrieve_sinfo` output with `ast.literal_eval` instead
  of `eval`.

### Fixed
- Job-history rows with exactly 8 fields no longer raise an IndexError.

### Removed
- A committed quota-request log file containing user data.
