"""
Shared configuration for all API route modules.

Reads config.yml once at import time and exposes the values as module-level
constants. All route modules should import from here rather than re-reading
the config file themselves.
"""

import os
import logging
import yaml

# __file__ is views/api/config.py, so we need three dirname calls to reach
# the project root (views/api/ -> views/ -> project root)
_api_dir = os.path.dirname(os.path.abspath(__file__))
_views_dir = os.path.dirname(_api_dir)
_project_root = os.path.dirname(_views_dir)

config_path = os.path.join(_project_root, 'config.yml')

with open(config_path, 'r') as _f:
    _config_data = yaml.safe_load(_f)

_production = _config_data.get('development', {})

cluster_name   = _production.get('cluster_name')
dashboard_url  = _production.get('dashboard_url')
request_email  = _production.get('request_email')
help_email     = _production.get('help_email')
hprcbot_route  = _production.get('hprcbot_route')

# Mail relay for the quota-request email fallback (bot_requests.py).
smtp_host      = _production.get('smtp_host') or 'smtp.tamu.edu'
smtp_port      = int(_production.get('smtp_port') or 25)

# Site tools the backend runs. Override any of these under `tools:` in
# config.yml; anything not listed keeps the TAMU default below. Output formats
# each tool must produce are documented in docs/sysadmin/widgets.md.
_DEFAULT_TOOLS = {
    "showquota":      "/sw/local/bin/showquota",
    "myproject":      "/sw/local/bin/myproject",
    "pestat":         "/sw/local/bin/pestat",
    "retrieve_sinfo": "/sw/local/bin/retrieve_sinfo",
    "cpuavail":       "/sw/local/bin/cpuavail",
    "toolchains":     "/sw/local/bin/toolchains",
    "delete_venv":    "/sw/local/bin/delete_venv",
    "create_venv":    "/sw/local/bin/create_venv",   # runs on login_node
    "modulair":       "modulair",                    # runs on login_node, found on PATH
}
tools = {**_DEFAULT_TOOLS, **(_production.get('tools') or {})}


def tool_path(name):
    """Return the configured path for a site tool (see `tools:` in config.yml)."""
    return tools[name]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


