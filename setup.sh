#!/bin/bash
set -eo pipefail
IFS=$'\n\t'

CURRENTDIR=`basename "$PWD"`
CLUSTERNAME=Aces

# Capitalize first letter of CLUSTERNAME
CLUSTERNAME="$(tr '[:lower:]' '[:upper:]' <<< ${CLUSTERNAME:0:1})${CLUSTERNAME:1}"

# Export variables
export CLUSTERNAME
export APPNAME="$CURRENTDIR"
export USERNAME="$USER"

# Generate runtime-ready configs from templates
envsubst < config.yml.template > config.yml
envsubst < manifest.yml.template > manifest.yml

# Virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt



npm install -D babel-loader @babel/core @babel/preset-react
npm run build
