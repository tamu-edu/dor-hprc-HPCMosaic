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
        # Check if the metadata file exists first, rather than catching in an exception. It is a common case; exceptions should be used for unexpected edge cases, hence the name
        if not os.path.exists(metadataPath):
            return jsonify({"error": f"There was no metadata file found; user likely has not yet used 'create_venv' to make a virtual environment", "code": f"NO_METADATA"}), 500
        with open(metadataPath,'r') as file:
            metadata = json.load(file)  
            return metadata, 200
    except json.JSONDecodeError as e:
        return jsonify({"error": f"The metadata file is corrupted or not in JSON format: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error while fetching user's venvs: {str(e)}"}), 500

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
        return jsonify({"error": f"delete_venv script failed with error: {e.stdout.strip()}"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error deleting the environment: {str(e)}"}), 500

@api.route('/get_py_versions', methods=['GET'])
def get_py_versions():
    try:
        captureCommand = "/sw/local/bin/toolchains | grep Python > captured-output.txt"
        removeCommand = "rm captured-output.txt"
        subprocess.run(captureCommand, shell=True)
        versions = {}
        with open("captured-output.txt", "r") as file:
            next(file)
            # Grabbing the Python version and mapping it to corresponding GCC version
            for line in file:
                words = line.split()
                if words[6] in versions:
                    break
                else:
                    versions[words[6]] = words[2]
        subprocess.run(removeCommand, shell=True)
        return jsonify(versions), 200
    except FileNotFoundError as e:
        return jsonify({"error": "There was a file error while getting the Python versions; 'captured-output.txt' file was not found"}), 500
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error while fetching Python versions: {str(e)}"}), 500

@api.route('create_venv', methods=['POST'])
def create_venv():
    try:
        data = request.json
        envName = data.get('envName')
        description = data.get('description')
        pyVersion = data.get('pyVersion')
        gccversion = data.get('GCCversion')
        
        if not envName or not gccversion or not pyVersion:
            return jsonify({"error": "Missing required parameters from the form submission"}), 400
    
        # When running commands on the flask server machine for this app, you will need to source /etc/profile before using ml/module load
        createVenvCommand = f"source /etc/profile && module load {gccversion} {pyVersion} && /sw/local/bin/create_venv {envName} -d '{description}'"
        
        result = subprocess.run(createVenvCommand, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')
        if result.returncode != 0:
            return jsonify({"error": f"There was an error while creating the virtual environment: {result.stdout}"}), 500
        return jsonify({"message": f"{envName} was successfully created!"}), 200
    except Exception as e:
        return jsonify({"error": f"There was an unexpected error while creating a new venv: {str(e)}"}), 500
