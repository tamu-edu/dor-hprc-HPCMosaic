from flask import Flask, render_template, redirect, jsonify
from flask_cors import CORS
from views.api import api
import yaml
import os
import sqlite3
import re
import logging

app = Flask(__name__, static_folder='static', static_url_path='/static')
APP_ROOT = os.path.dirname(os.path.abspath(__file__))

def detect_env():
    configured_env = os.environ.get("RACK_ENV", "").strip().lower()
    if configured_env in {"development", "production"}:
        return configured_env

    paths = (os.getcwd(), APP_ROOT, os.environ.get("PWD", ""))
    if any("/dev/" in path or "/ood_dev/" in path for path in paths):
        return "development"
    elif any("/sys/" in path for path in paths):
        return "production"
    else:
        return "unknown"

# DEVELOPMENT
CORS(app)
# env = os.environ["RACK_ENV"]
env = detect_env()

def load_config(config_file='config.yml'):
    config_path = (
        config_file
        if os.path.isabs(config_file)
        else os.path.join(APP_ROOT, config_file)
    )
    with open(config_path, 'r') as file:
        config_data = yaml.safe_load(file)
    return config_data


config = load_config()['development'] if env == 'development' else load_config()['production']
app.config.update(config)
app.config['user'] = os.environ['USER']

app.register_blueprint(api, url_prefix='/api')

@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
        app.run(debug=True)
	#app.run(debug=True,threaded=True)
