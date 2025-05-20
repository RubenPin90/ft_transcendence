#!/bin/sh

BASIC_AUTH_USER=$PROM_USER
BASIC_AUTH_PASS=$(cat $PROM_PASS_FILE)

PASS_FILE=/etc/nginx/.htpasswd

if [ ! -f $PASS_FILE ]; then
    HASHED_PASS=$(openssl passwd -apr1 $BASIC_AUTH_PASS)
    echo "$BASIC_AUTH_USER:$HASHED_PASS" > $PASS_FILE
fi

exec "$@"