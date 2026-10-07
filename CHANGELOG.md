# Changelog

All notable changes to HPCMosaic are documented here. This project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

First tagged release, prepared for the Open OnDemand Appverse.

### Added
- Sysadmin documentation in `docs/sysadmin/`: deployment guide, per-widget
  input contracts, and external integrations (support webhook, email, SSH).
- `site-scripts/` for the site tools the backend calls.
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
