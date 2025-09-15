#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Check if CLUSTERNAME is set
if [[ -z "${CLUSTERNAME:-}" ]]; then
    echo "Error: CLUSTERNAME environment variable is not set" >&2
    echo "Please run: export CLUSTERNAME=the_actual_name_of_cluster_here" >&2
    echo "Then run: ./setup.sh" >&2
    exit 1
fi

CURRENTDIR=`basename "$PWD"`

# Capitalize first letter of CLUSTERNAME
CLUSTERNAME="$(tr '[:lower:]' '[:upper:]' <<< ${CLUSTERNAME:0:1})${CLUSTERNAME:1}"

echo "Cluster name is: $CLUSTERNAME"

# Export variables
export CLUSTERNAME
export APPNAME="$CURRENTDIR"
export USERNAME="$USER"

# Generate runtime-ready configs from templatesi
echo "Generating configs from templates..."
envsubst < config.yml.template > config.yml
envsubst < manifest.yml.template > manifest.yml

# Virtual environment
echo "Setting up Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

#Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

#Node Dependencies
echo "Installing Node dependencies and building..."
npm install -D babel-loader @babel/core @babel/preset-react
npm run build

echo "Setup complete!"
