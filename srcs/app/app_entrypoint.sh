#!/bin/bash

if [ ! -f database/db.sqlite ]; then
  node database/create_db.js
  mv db.sqlite database/db.sqlite
fi

exec "$@"
