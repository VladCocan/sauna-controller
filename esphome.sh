#!/bin/bash
# ESPHome helper script
# Usage:
#   ./esphome.sh version
#   ./esphome.sh config sauna-controller.yaml
#   ./esphome.sh compile sauna-controller.yaml
#   ./esphome.sh run sauna-controller.yaml

cd "$(dirname "$0")"
./esphome-venv/bin/python -m esphome "$@"
