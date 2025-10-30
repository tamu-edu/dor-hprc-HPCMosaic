#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Set CLUSTERNAME
if [[ -z "${CLUSTERNAME:-}" ]]; then
    read -p "Enter cluster name: " CLUSTERNAME
    if [[ -z "$CLUSTERNAME" ]]; then
	echo "Error: Cluster name cannot be empty" >&2
	exit 1
    fi
fi

# Decide env type
echo "Is this a dev or production environment?"
read -p "Enter 'dev' or 'prod': " ENV_TYPE
ENV_TYPE=${ENV_TYPE}

if [[ "$ENV_TYPE"  == "dev" ]]; then
    export ENV_SUFFIX="-dev"
elif [[ "$ENV_TYPE"  == "prod" ]]; then
    export ENV_SUFFIX=""
else
    echo "Invalid/missing input, defaulting to dev."
    ENV_TYPE="dev"
    export ENV_SUFFIX="-dev"
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
