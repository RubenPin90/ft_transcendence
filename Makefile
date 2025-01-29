all: install

install:
	sudo make --no-print-directory updating-system
	sudo make --no-print-directory docker-install

updating-system:
	@echo "\033[0;34mUpdating VM\033[0m"
	sudo apt-get update
	sudo apt-get -y upgrade
	@echo "127.0.0.1 yatabay.42.fr" >> /etc/hosts

docker-install:
	@echo "\033[0;34mInstalling curl\033[0m"
	sudo apt install curl
	@echo "\033[0;34mInstalling docker\033[0m"
	sudo apt install apt-transport-https ca-certificates curl software-properties-common
	curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
	@echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $$(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
	sudo apt update
	sudo apt install docker-ce docker-ce-cli containerd.io

create-env:
	chmod +x ./secrets/build_env.sh
	/bin/bash ./secrets/build_env.sh
	mv .env srcs/

up:
	@docker compose -f ./srcs/docker-compose.yml up

build:
	@docker compose -f ./srcs/docker-compose.yml up --build

down:
	@docker compose -f ./srcs/docker-compose.yml down

stop:
	@docker compose -f ./srcs/docker-compose.yml stop

rebuild:
	@docker system prune -a
	@docker compose -f ./srcs/docker-compose.yml up

status:
	@docker ps -a

prune:
	@docker system prune -a --volumes
	@docker system prune -a
	@rm -rf volume_data

.PHONY: all install updating-system docker-install build-env create-env up build down stop rebuild status
