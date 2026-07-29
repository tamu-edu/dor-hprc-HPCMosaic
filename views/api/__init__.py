"""
views/api package

All routes are registered under the /api prefix (set in app.py).

  layout.py       — Dashboard layout persistence
    POST   /save_layout               Save a named layout to disk
    GET    /get_layouts               List all saved layout names
    GET    /load_layout?layout_name=  Load a layout by name
    DELETE /delete_layout             Delete a layout by name
    POST   /rename_layout             Rename an existing layout

  preferences.py  — Per-user server-side preferences
    GET    /get_preferences           Fetch all preferences (returns {} if none saved yet)
    POST   /save_preferences          Partial-merge update to preferences
                                      Current keys: default_layout (str|null),
                                      dashboard_layout (object|null)

  info.py         — Read-only cluster state queries
    GET    /user-data                 Current user's username and institutional email
    GET    /sinfo                     Raw node info from retrieve_sinfo
    GET    /showquota                 Disk/file quota usage per filesystem
    GET    /groups                    Groups the current user belongs to
    GET    /cpuavail                  Node configuration and CPU availability
    GET    /system-load               Web server load averages and normalized 5m load
    GET    /gpu-resources             GPU node and GPU allocation counts for the gpu partition
    GET    /node/<node_name>          Detailed SLURM node information
    GET    /node/<node_name>/jobs     Jobs currently running on a node

  modules.py      — Python virtual environment management
    GET    /get_env                   List existing venvs from metadata.json
    DELETE /delete_env/<name>         Delete a named venv
    GET    /get_py_versions           Available Python versions and GCC toolchains
    POST   /create_venv               Create a new venv via SSH to login node
    GET    /available_modules          List modules available on the cluster

  jobs.py         — SLURM job and project management
    GET    /jobs                      Active jobs for current user (squeue only)
    GET    /jobs/list                 Paginated Job Explorer rows (squeue or scoped sacct)
    GET    /jobs/past_jobs            Paginated 24-hour history for the current user
    GET    /jobs/<job_id>             Lazy single-job details (scontrol)
    GET    /jobs/details              Legacy active Slurm job records for Job Explorer
    GET    /jobs/summary              Aggregate Slurm job counts for Job Explorer
    POST   /cancel_job/<job_id>       Cancel a job via scancel
    GET    /projectinfo               Project accounts, job history, or pending jobs
    POST   /set_default_account       Set default myproject account
    GET    /utilization               Cluster-wide node/CPU/job utilization (pestat)

  bot_requests.py — HPRC support request form submissions
    POST   /quota                     Quota increase request (bot, falls back to email)
    POST   /group                     Group create/modify request
    POST   /help                      General help request
    POST   /software                  Software installation request
    POST   /account                   Account purchase request
    POST   /submit_acknowledgement    Publication acknowledgement submission
  announcement.py — Staff-managed dashboard announcements
    GET    /announcements             Valid, enabled, currently active announcements
    GET    /admin/announcements       All announcements for authorized administrators
    POST   /admin/announcements       Create an announcement
    PUT    /admin/announcements/<id>  Update an announcement
    DELETE /admin/announcements/<id>  Delete an announcement
    PUT    /admin/announcements/order Reorder all announcements


Adding a new route module
--------------------------
  1. Create a new file in this directory (e.g. my_feature.py)
  2. At the top: from . import api
  3. Define routes with @api.route(...)
  4. Add `from . import my_feature` in the imports block below
  5. Add it to the route index above
"""

from flask import Blueprint
api = Blueprint('api', __name__)

# Register route modules. Add new modules here as the API grows.
from . import layout       # /save_layout, /get_layouts, /load_layout, /delete_layout, /rename_layout
from . import preferences  # /get_preferences, /save_preferences
from . import info         # /user-data, /sinfo, /showquota, /groups, /cpuavail
from . import modules      # /get_env, /delete_env, /get_py_versions, /create_venv
from . import jobs         # /jobs, /cancel_job, /projectinfo, /set_default_account, /utilization
from . import bot_requests # /quota, /group, /help, /software, /account, /submit_acknowledgement
from . import announcement # /announcements
