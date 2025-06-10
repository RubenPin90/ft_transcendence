#!/bin/bash

KEY="$(cat $PINGGY_TOKEN)+tcp@eu.pro.pinggy.io"

exec ./pinggy -p 80 -R0:nginx:80 "$KEY"