#!/bin/bash

if ! python3.11 --version >> /dev/null; then
        echo "Python not installed"
        exit 1
fi

if ! python3.11 -m pip --version >> /dev/null; then
        echo "pip not installed. Installing..."
        curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
fi

if ! python3.11 -m django --version >> /dev/null; then
        echo "django not installed. Installing..."
        python3.11 -m pip install django
fi
