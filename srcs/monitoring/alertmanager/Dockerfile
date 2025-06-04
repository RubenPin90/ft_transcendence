FROM prom/alertmanager:v0.28.0

ARG SMTP_HOST
ARG SMTP_USER
ARG SMTP_PASS_FILE
ARG EMAIL_FROM
ARG EMAIL_TO

COPY ./alertmanager.yml /etc/alertmanager/alertmanager.yml

USER root
RUN --mount=type=secret,id=smtp_password \
  SMTP_PASS=$(cat /run/secrets/smtp_password) && \
  sed -i "s|SMTP_PASS|$SMTP_PASS|g" /etc/alertmanager/alertmanager.yml
    
RUN sed -i "s|EMAIL_TO|${EMAIL_TO}|g" /etc/alertmanager/alertmanager.yml && \
    sed -i "s|EMAIL_FROM|${EMAIL_FROM}|g" /etc/alertmanager/alertmanager.yml && \
    sed -i "s|SMTP_HOST|${SMTP_HOST}|g" /etc/alertmanager/alertmanager.yml && \
    sed -i "s|SMTP_USER|${SMTP_USER}|g" /etc/alertmanager/alertmanager.yml

USER nobody

CMD ["--config.file=/etc/alertmanager/alertmanager.yml"] 
