# Site scripts

HPCMosaic's backend calls these TAMU HPRC tools at hardcoded paths. Their
sources are kept in this folder so other sites can adapt them. Each tool's
expected output format is documented in
[`docs/sysadmin/widgets.md`](../docs/sysadmin/widgets.md).

| Path called by the backend | Called from | Used by card | Output contract |
|---|---|---|---|
| `/sw/local/bin/showquota` | `views/api/info.py`, `views/api/quota_inspection.py` | My Quotas Summary, Quota Information, User Groups | [showquota](../docs/sysadmin/widgets.md#showquota-site-tool) |
| `/sw/local/bin/myproject` | `views/api/projects.py` | Accounts, Project Information | [myproject](../docs/sysadmin/widgets.md#myproject-site-tool) |
| `/sw/local/bin/retrieve_sinfo` | `views/api/info.py` | Node Utilization | [retrieve_sinfo](../docs/sysadmin/widgets.md#retrieve_sinfo-site-tool) |
| `/sw/local/bin/pestat` | `views/api/jobs.py` | CPU Utilization | [pestat](../docs/sysadmin/widgets.md#pestat-site-tool-open-source) ([upstream](https://github.com/OleHolmNielsen/Slurm_tools/tree/master/pestat)) |
| `/sw/local/bin/toolchains` | `views/api/modules.py` | Python Venv Manager | [toolchains](../docs/sysadmin/widgets.md#toolchains-local) |
| `/sw/local/bin/create_venv` | `views/api/modules.py` (over SSH) | Python Venv Manager | [create_venv](../docs/sysadmin/widgets.md#create_venv-over-ssh) |
| `/sw/local/bin/delete_venv` | `views/api/modules.py` | Python Venv Manager | [delete_venv](../docs/sysadmin/widgets.md#delete_venv-local) |
| `modulair` (on `PATH` on the login node) | `views/api/modules.py` (over SSH) | Python Venv Manager | [modulair list](../docs/sysadmin/widgets.md#modulair-list-over-ssh) |
| `/sw/local/bin/cpuavail` | `views/api/info.py` | none (unused endpoint) | [cpuavail](../docs/sysadmin/widgets.md#unused-endpoint-apicpuavail) |
| *(generator)* `modules/<cluster>-modules.json` | `views/api/modules.py` | Software Modules | [catalog format](../docs/sysadmin/widgets.md#software-modules) |

<!-- TODO(HPRC): add each script's source (or a link to its repository) here. -->
