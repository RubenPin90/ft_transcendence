FROM nginx:1.27.5-alpine-slim

RUN apk update && \
    apk add --no-cache openssl
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -subj "/C=AT/ST=Vienna/L=Vienna/O=42Vienna/CN=rpinchas.42.fr" \
    -keyout /etc/ssl/private/selfsigned.key \
    -out /etc/ssl/certs/selfsigned.crt

COPY ./tools/nginx_entrypoint.sh /usr/local/bin/nginx_entrypoint.sh
RUN chmod +x /usr/local/bin/nginx_entrypoint.sh

ENTRYPOINT [ "/usr/local/bin/nginx_entrypoint.sh" ]

CMD [ "nginx", "-g", "daemon off;" ]