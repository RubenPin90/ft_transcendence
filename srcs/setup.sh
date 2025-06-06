#!/bin/bash

OAUTH_FILE=./srcs/secrets.yml
ENV_FILE=./srcs/.env
USER=$(whoami)

function yaml() {
    yq -r "$1" "$OAUTH_FILE"
}

declare -A secrets=(
    ["google"]=".secrets.google.client_secret"
    ["github"]=".secrets.github.client_secret"
    ["smtp"]=".secrets.smtp.pass"
    ["jwt"]=".secrets.jwt.pass"
    ["prometheus"]=".secrets.prometheus.pass"
    ["grafana"]=".secrets.grafana.pass"
)

declare -A users=(
    ["GOOGLE_CLIENT_ID"]=".secrets.google.client_id"
    ["GITHUB_CLIENT_ID"]=".secrets.github.client_id"
    ["SMTP_USER"]=".secrets.smtp.user"
    ["ADMIN_EMAIL"]=".secrets.admin.mail"
)

echo "Setting up environment and secrets..."

if [ -f "$OAUTH_FILE" ]; then
    for k in ${!secrets[@]}; do 
        tmp=$(yaml ${secrets[$k]})
        echo $tmp > ./secrets/${k}.txt;
    done
    for k in ${!users[@]}; do
        sed -i "s|$k=#|$k=$(yaml ${users[$k]})|g" $ENV_FILE;
    done
fi
