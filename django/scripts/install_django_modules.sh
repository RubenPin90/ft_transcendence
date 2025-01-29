#!/bin/bash

if ! python3.11 -m pip list | grep -F django-htmx >> "/dev/null"; then
    echo "Django-htmx is not installed. Installing..."
    python3.11 -m pip install django-htmx
fi
