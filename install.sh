#!/bin/bash

sudo apt update
sudo apt install python3 python3-dev python3-venv libmysqlclient-dev gcc tesseract-ocr unixodbc-dev
python3 -m venv venv
source venv/bin/activate
pip install wheel
pip install -r requirements.txt