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

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


