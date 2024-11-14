from flask import Blueprint, render_template, request, jsonify, current_app as app
import json
import sqlite3
import re
import os
from machine_driver_scripts.engine import Engine
import subprocess

api = Blueprint('api', __name__)

@api.route('/sinfo', methods=['GET'])
def get_sinfo():
    try:
        result = subprocess.check_output("/sw/local/bin/retrieve_sinfo", shell=True, stderr=subprocess.STDOUT)
        output = result.decode("utf-8")
        print("Raw Output:", output)  # Debugging: print raw output
        return jsonify(eval(output)), 200
    except subprocess.CalledProcessError as e:
        error_message = e.output.decode("utf-8")
        return jsonify({"error": f"Command failed: {error_message}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

