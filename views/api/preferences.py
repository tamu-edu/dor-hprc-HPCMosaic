"""
User preferences routes.

Preferences are stored as a single _preferences.json file in the user's
layouts directory. Using one file (rather than one endpoint per preference)
means adding new preferences never requires new backend endpoints — just add
a field to the JSON object.
save_preferences accepts partial updates: only the keys provided are changed,
all others are preserved.

Current preference keys:
  default_layout (str | null) — layout name to auto-load on login
  dashboard_layout (object | null) — automatically restored current dashboard layout
"""

import os
import json
from flask import request, jsonify
from . import api
from .utils import get_preferences_path


@api.route('/get_preferences', methods=['GET'])
def get_preferences():
    """Return the user's saved preferences, or an empty object if none exist yet."""
    try:
        user = os.getenv("USER", "default_user")
        prefs_path = get_preferences_path(user)

        if not os.path.exists(prefs_path):
            return jsonify({"preferences": {}}), 200

        with open(prefs_path, 'r') as f:
            preferences = json.load(f)

        return jsonify({"preferences": preferences}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/save_preferences', methods=['POST'])
def save_preferences():
    """Merge incoming key/value pairs into the stored preferences file."""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No preference data provided"}), 400

        user = os.getenv("USER", "default_user")
        prefs_path = get_preferences_path(user)

        existing = {}
        if os.path.exists(prefs_path):
            with open(prefs_path, 'r') as f:
                existing = json.load(f)

        existing.update(data)

        with open(prefs_path, 'w') as f:
            json.dump(existing, f, indent=4)

        return jsonify({"message": "Preferences saved successfully", "preferences": existing}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
