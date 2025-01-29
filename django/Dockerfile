FROM debian:bullseye

RUN apt-get update && apt-get upgrade
RUN apt-get curl -y
COPY ./scripts/. .

RUN chmod 777 install_python.sh
RUN chmod 777 install_django.sh
RUN chmod 777 install_django_modules.sh

RUN ./install_python.sh
RUN ./install_django.sh
RUN ./install_django_modules.sh