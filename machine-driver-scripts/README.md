# Site scripts

HPCMosaic's backend calls these tools at hardcoded paths. Each tool's expected
output format is documented in
[`docs/sysadmin/widgets.md`](../docs/sysadmin/widgets.md).

## What's available

**Included in this folder** (TAMU HPRC scripts):

| File | Install as | Works elsewhere? |
|---|---|---|
| [`retrieve_sinfo`](retrieve_sinfo) | `/sw/local/bin/retrieve_sinfo` | **Yes.** Python 3, plain `sinfo` only. |
| [`showquota.generic`](showquota.generic) | `/sw/local/bin/showquota` | **With changes.** Bash; assumes Lustre project quotas and `/home/<user>`, `/scratch/user/<user>`, `/scratch/group/<group>`. Keep the output format and replace the quota lookup for other filesystems. |
| [`toolchains`](toolchains) | `/sw/local/bin/toolchains` | **Reference only.** Perl; needs its helper `ToolChains.pm` (not included) and TAMU's EasyBuild layout (`/sw/eb/sw`, `/sw/hprc/sw`). HPCMosaic only reads its default table, so a short script printing the same columns is enough. |

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
| *(generator)* `modules/<cluster>-modules.json` | Not published | `views/api/modules.py` | Software Modules | [catalog format](../docs/sysadmin/widgets.md#software-modules) |
