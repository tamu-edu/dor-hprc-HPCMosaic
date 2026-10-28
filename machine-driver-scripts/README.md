# Site scripts

HPCMosaic's backend calls these tools at the paths below by default. To use
a different location, set it under `tools:` in `config.yml`. Each tool's
expected output format is documented in
[`docs/sysadmin/widgets.md`](../docs/sysadmin/widgets.md).

## What's available

**Included in this folder** (TAMU HPRC scripts):

| File | Install as | Works elsewhere? |
|---|---|---|
| [`retrieve_sinfo`](retrieve_sinfo) | `/sw/local/bin/retrieve_sinfo` | **Yes.** Python 3, plain `sinfo` only. |
| [`showquota.generic`](showquota.generic) | `/sw/local/bin/showquota` | **With changes.** Bash; assumes Lustre project quotas and `/home/<user>`, `/scratch/user/<user>`, `/scratch/group/<group>`. Keep the output format and replace the quota lookup for other filesystems. |
| [`toolchains`](toolchains) | `/sw/local/bin/toolchains` | **Reference only.** Perl; needs its helper `ToolChains.pm` (not included) and TAMU's EasyBuild layout (`/sw/eb/sw`, `/sw/hprc/sw`). HPCMosaic only reads its default table, so a short script printing the same columns is enough. |
| [`generate_module_catalog.py`](generate_module_catalog.py), [`generate_module_catalog.sbatch`](generate_module_catalog.sbatch) | Not installed; run on each cluster to build `<app root>/modules/<cluster>-modules.json` (see [below](#module-catalog)) | **Yes.** Python 3.6+ and Lmod only. Slurm is optional. |

**Open source elsewhere:**

- **ModuLair** provides `modulair`, `create_venv` and `delete_venv`:
  [tamu-edu/dor-hprc-venv-manager](https://github.com/tamu-edu/dor-hprc-venv-manager)
  (MIT). Follow its README to install it, then make its `bin/` scripts
  available at the paths below. TAMU symlinks them into `/sw/local/bin/`.
- **pestat**:
  [OleHolmNielsen/Slurm_tools](https://github.com/OleHolmNielsen/Slurm_tools/tree/master/pestat).
  TAMU runs the unmodified GitHub version.

**Not published:**

- **`myproject`** is tied to TAMU's service-unit accounting. Sites without an
  equivalent should remove the Accounts and Project Information cards.
- **`cpuavail`** backs an endpoint that no card uses.

## All tools

| Path called by the backend | Source | Called from | Used by card | Output contract |
|---|---|---|---|---|
| `/sw/local/bin/retrieve_sinfo` | [this folder](retrieve_sinfo) | `views/api/info.py` | Node Utilization | [retrieve_sinfo](../docs/sysadmin/widgets.md#retrieve_sinfo-site-tool) |
| `/sw/local/bin/showquota` | [this folder](showquota.generic) (generic version) | `views/api/info.py`, `views/api/quota_inspection.py` | My Quotas Summary, Quota Information, User Groups | [showquota](../docs/sysadmin/widgets.md#showquota-site-tool) |
| `/sw/local/bin/toolchains` | [this folder](toolchains) (reference) | `views/api/modules.py` | Python Venv Manager (Python version list) | [toolchains](../docs/sysadmin/widgets.md#toolchains-local) |
| `/sw/local/bin/pestat` | [pestat](https://github.com/OleHolmNielsen/Slurm_tools/tree/master/pestat) | `views/api/jobs.py` | CPU Utilization | [pestat](../docs/sysadmin/widgets.md#pestat-site-tool-open-source) |
| `modulair` (on `PATH` on the login node) | [ModuLair](https://github.com/tamu-edu/dor-hprc-venv-manager) | `views/api/modules.py` (over SSH) | Python Venv Manager | [modulair list](../docs/sysadmin/widgets.md#modulair-list-over-ssh) |
| `/sw/local/bin/create_venv` | [ModuLair](https://github.com/tamu-edu/dor-hprc-venv-manager) | `views/api/modules.py` (over SSH) | Python Venv Manager | [create_venv](../docs/sysadmin/widgets.md#create_venv-over-ssh) |
| `/sw/local/bin/delete_venv` | [ModuLair](https://github.com/tamu-edu/dor-hprc-venv-manager) | `views/api/modules.py` | Python Venv Manager | [delete_venv](../docs/sysadmin/widgets.md#delete_venv-local) |
| `/sw/local/bin/myproject` | Not published (TAMU-specific) | `views/api/projects.py` | Accounts, Project Information | [myproject](../docs/sysadmin/widgets.md#myproject-site-tool) |
| `/sw/local/bin/cpuavail` | Not published | `views/api/info.py` | none (unused endpoint) | [cpuavail](../docs/sysadmin/widgets.md#unused-endpoint-apicpuavail) |
| *(generated file)* `modules/<cluster>-modules.json` | [this folder](generate_module_catalog.py) | `views/api/modules.py` | Software Modules | [catalog format](../docs/sysadmin/widgets.md#software-modules) |

## Module catalog

The Software Modules card doesn't run any commands. It reads
`<app root>/modules/<cluster>-modules.json`, and
`generate_module_catalog.py` builds that file from Lmod. It runs
`module spider` once to list every module, then once per module to read its
description and prerequisites. That's thousands of lookups, so run it as a
batch job rather than on a login node:

```bash
cd machine-driver-scripts
sbatch generate_module_catalog.sbatch            # writes <cluster>-modules.json here
sbatch generate_module_catalog.sbatch /path/to/aces-modules.json
```

The job requests 48 CPUs for one hour, and the script starts one worker per
CPU. Edit the `#SBATCH` lines for your nodes, and add `--partition` or
`--account` if your site requires them.

Without Slurm, run it directly. It uses 5 workers unless you pass
`--workers`:

```bash
python3 generate_module_catalog.py --cluster aces --output /path/to/app/modules/aces-modules.json
```

- **Name:** the file name must be `<cluster_name>-modules.json`, with
  `cluster_name` lower-cased exactly as in `config.yml`. The script takes the
  name from `--cluster` if given. Otherwise it reads `cluster_name` from the
  checkout's `config.yml` (one level above this folder), the same value the
  dashboard uses. If there's no `config.yml`, it uses `SLURM_CLUSTER_NAME`,
  which may not match, so check the name or pass `--cluster` or `--output`.
- **Install:** copy the file into `<app root>/modules/`. The dashboard
  reloads it when its modification time or size changes, so no restart is
  needed. The script replaces its output in one step, so it can also write
  straight into `modules/` if the job can reach the app directory.
- **Refresh:** re-run it after software installs, for example from a monthly
  `scrontab` or cron entry.
- **Failures:** if `module spider` lists nothing, the script exits without
  writing, so a working catalog is never replaced with an empty one. A
  module whose own lookup fails or times out (60 s) is still written, with no
  description or prerequisites and an `error` key. The script prints the
  number of failures at the end.
- **Default versions:** the script doesn't set `is_default`, so the card
  shows no "default" badge.
