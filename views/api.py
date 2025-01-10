from flask import Blueprint, render_template, request, jsonify, current_app as app
import json
from sys import version as python_formatted_version
import sqlite3
import re
import os
from machine_driver_scripts.engine import Engine
from collections import OrderedDict
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

@api.route('/get_env', methods=['GET'])
def get_envs():
    envs = str(os.environ)
    scratch = os.path.expandvars("/scratch/user/$USER")
    virtual_envs = "virtual_envs/metadata.json"
    metadataPath = os.path.join(scratch, virtual_envs)
    try:
        with open(metadataPath,'r') as file:
            metadata = json.load(file)  
            return metadata, 200
    except FileNotFoundError as e:
        return jsonify({"error": f"There was no metadata file found; you likely have not yet used 'create_venv' to make a virtual environment: {str(e)}"}), 500
    except json.JSONDecodeError as e:
        return jsonify({"error": f"The metadata file is corrupted or not in JSON format: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error: {str(e)}"}), 500

@api.route('/delete_env/<envToDelete>', methods=['DELETE'])
def delete_env(envToDelete):
    try:
        if "SCRATCH" not in os.environ:
            os.environ["SCRATCH"] = os.path.expandvars("/scratch/user/$USER")
        script = f"/sw/local/bin/delete_venv"
        result = subprocess.run([script, envToDelete], stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')
        if result.returncode != 0:
            raise RuntimeError(f"Error deleting environment: {result.stdout.strip()}")
        return jsonify({"message": result.stdout.strip()}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Script failed with error: {e.stdout.strip()}"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error deleting the environment: {str(e)}"}), 500
