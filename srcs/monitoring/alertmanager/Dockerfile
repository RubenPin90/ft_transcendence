FROM prom/alertmanager:v0.28.0

COPY ./alertmanager.yml /etc/alertmanager/alertmanager.yml


RUN --mount=type=secret,id=smtp_password \
    echo $(cat /run/secrets/smtp_password)

RUN sed -i "s|EMAIL_TO|${EMAIL_TO}|g" /etc/alertmanager/alertmanager.yml && \
    sed -i "s|EMAIL_FROM|${EMAIL_FROM}|g" /etc/alertmanager/alertmanager.yml && \
    sed -i "s|SMTP_HOST|${SMTP_HOST}|g" /etc/alertmanager/alertmanager.yml && \
    sed -i "s|SMTP_USER|${SMTP_USER}|g" /etc/alertmanager/alertmanager.yml

# CMD ["--config.file=/etc/alertmanager/alertmanager.yml"] 

CMD ["tail", "-f", "/dev/null"]