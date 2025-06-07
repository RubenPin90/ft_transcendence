#!/bin/bash

if [ -f database/db.sqlite ]; then
  rm database/db.sqlite
fi

node database/create_db.js
mv db.sqlite database/db.sqlite

exec "$@"