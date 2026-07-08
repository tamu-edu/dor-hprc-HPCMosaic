"""
Layout persistence routes.

Layouts are stored as individual JSON files under:
  /scratch/user/{USER}/ondemand/layouts/{layout_name}.json

Internal config files (prefixed with '_') are excluded from the layout list
so that _preferences.json doesn't appear as a user-created layout.
"""

import os
import json
from flask import request, jsonify
from . import api
from .utils import get_layouts_dir


@api.route('/save_layout', methods=['POST'])
def save_layout():
    try:
        data = request.json
        layout_name = data.get("layout_name")
        layout_data = data.get("layout_data")

        if not layout_name or not layout_data:
            return jsonify({"error": "Missing layout_name or layout_data"}), 400

        user = os.getenv("USER", "default_user")
        layouts_dir = get_layouts_dir(user)
        layout_file_path = os.path.join(layouts_dir, f"{layout_name}.json")

        with open(layout_file_path, 'w') as f:
            json.dump(layout_data, f, indent=4)

        return jsonify({"message": f"Layout '{layout_name}' saved successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/get_layouts', methods=['GET'])
def get_layouts():
    try:
        user = os.getenv("USER", "default_user")
        layouts_dir = get_layouts_dir(user)

        # Exclude internal config files (prefixed with '_', e.g. _preferences.json)
        layout_files = [
            f for f in os.listdir(layouts_dir)
            if f.endswith('.json') and not f.startswith('_')
        ]
        layout_names = [os.path.splitext(f)[0] for f in layout_files]

        return jsonify({"layouts": layout_names}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/load_layout', methods=['GET'])
def load_layout():
    try:
        layout_name = request.args.get("layout_name")
        if not layout_name:
            return jsonify({"error": "Missing layout_name"}), 400

        user = os.getenv("USER", "default_user")
        layouts_dir = get_layouts_dir(user)
        layout_file_path = os.path.join(layouts_dir, f"{layout_name}.json")

        if not os.path.exists(layout_file_path):
            return jsonify({"error": f"Layout '{layout_name}' does not exist"}), 404

        with open(layout_file_path, 'r') as f:
            layout_data = json.load(f)

        return jsonify({"layout_name": layout_name, "layout_data": layout_data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/delete_layout', methods=['DELETE'])
def delete_layout():
    try:
        layout_name = request.json.get("layout_name")

        if not layout_name:
            return jsonify({"error": "Missing layout_name"}), 400

        user = os.getenv("USER", "default_user")
        layouts_dir = get_layouts_dir(user)
        layout_file_path = os.path.join(layouts_dir, f"{layout_name}.json")

        if not os.path.exists(layout_file_path):
            return jsonify({"error": f"Layout '{layout_name}' does not exist"}), 404

        os.remove(layout_file_path)
        return jsonify({"message": f"Layout '{layout_name}' deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/rename_layout', methods=['POST'])
def rename_layout():
    try:
        data = request.json
        old_name = data.get("old_name")
        new_name = data.get("new_name")

        if not old_name or not new_name:
            return jsonify({"error": "Missing old_name or new_name"}), 400

        user = os.getenv("USER", "default_user")
        layouts_dir = get_layouts_dir(user)
        old_path = os.path.join(layouts_dir, f"{old_name}.json")
        new_path = os.path.join(layouts_dir, f"{new_name}.json")

        if not os.path.exists(old_path):
            return jsonify({"error": f"Layout '{old_name}' does not exist"}), 404

        if os.path.exists(new_path):
            return jsonify({"error": f"A layout named '{new_name}' already exists"}), 400

        os.rename(old_path, new_path)
        return jsonify({"message": f"Layout '{old_name}' renamed to '{new_name}' successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
