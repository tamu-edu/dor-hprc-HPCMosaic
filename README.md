# HPCMosaic

HPCMosaic is a customizable dashboard for HPC cluster users, developed by High
Performance Research Computing (HPRC) at Texas A&M University. Users drag
widget cards onto a grid to see their Slurm jobs, node and GPU status, storage
quotas and project accounts, manage Python virtual environments, browse
software modules, read announcements, and submit support requests.

It runs as an [Open OnDemand](https://openondemand.org/) Passenger app: a
[Flask](https://flask.palletsprojects.com/) backend with a React and Tailwind
CSS frontend.

## Overview

- **Intended users:** researchers on an OOD-enabled Slurm cluster.
- **Built for:** the TAMU HPRC clusters (ACES, Grace, FASTER, Launch). Many
  widgets use plain Slurm and work anywhere. Others read from TAMU site
  scripts or services. The [sysadmin guide](docs/sysadmin/README.md) lists
  which widgets these are and the exact input each one expects.

## Requirements

- Open OnDemand with Passenger app support
- Slurm client commands on the OOD web node (`sinfo`, `squeue`, `scontrol`,
  `sacct`, `scancel`; `sprio` optional)
- Python 3 and Node.js/npm on the OOD web node
- Optional: Lmod, passwordless SSH to a login node, and the site scripts
  listed in [`machine-driver-scripts/`](machine-driver-scripts/)

See the [requirements and dependency matrix](docs/sysadmin/README.md#dependency-matrix).

## Installation

```bash
git clone https://github.com/tamu-edu/dor-hprc-HPCMosaic.git
cd dor-hprc-HPCMosaic
./setup.sh
```

`setup.sh` asks for the cluster name, the internal login node, and whether this
is a dev or production install. It then generates `config.yml` and
`manifest.yml`, sets up announcement storage, installs Python dependencies, and
builds the frontend. **Before running it at a non-TAMU site, read
[Install](docs/sysadmin/README.md#install).** The announcement admin group is
hardcoded to `hprc`.

## Configuration

Site settings are in `config.yml`, generated from `config.yml.template`. Other
site-specific values (tool paths, partition names, links) are set in code. The
[site checklist](docs/sysadmin/README.md#making-it-work-at-your-site-checklist)
lists each one with its file and line.

- [Deployment guide and `config.yml` reference](docs/sysadmin/README.md)
- [Per-widget input formats](docs/sysadmin/widgets.md)
- [Support-request webhook, email, SSH, announcements](docs/sysadmin/integrations.md)
- [Announcement file format and admin workflow](docs/sysadmin/ANNOUNCEMENTS.md)

## Development

| Change | Then run |
|---|---|
| Frontend code or `config.yml` | `npm run build` (or `npm run build-watch` while developing) |
| Backend code | Restart the web server from the OOD portal (Help → Restart Web Server) |

[`docs/sysadmin/CODEBASE_OVERVIEW.md`](docs/sysadmin/CODEBASE_OVERVIEW.md) describes the code layout.

## Known limitations

See [Known limitations](docs/sysadmin/README.md#known-limitations).

## Support

TAMU users: help@hprc.tamu.edu. Bugs and questions from other sites:
[GitHub issues](https://github.com/tamu-edu/dor-hprc-HPCMosaic/issues).
