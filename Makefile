CMD := docker compose
FLAG := -f
# SHELL := /bin/bash

ROOT_DIR := $(shell pwd)
SRC_DIR := $(ROOT_DIR)/srcs
COMPOSE_FILE := $(SRC_DIR)/docker-compose.yml
ENV_FILE := $(SRC_DIR)/.env
ENV_TMP_FILE := $(SRC_DIR)/.env.example

USER_NAME := $(shell whoami)
DATA_GRAFANA := $(SRC_DIR)/monitoring/grafana/data

SECRETS_DIR := $(ROOT_DIR)/secrets
ENC_FILE := $(SRC_DIR)/secrets.yml.enc
OAUTH_KEY := $(SRC_DIR)/secrets.key
OAUTH_FILE := $(SRC_DIR)/secrets.yml

all: compose

compose: .init_setup
	@$(CMD) $(FLAG) $(COMPOSE_FILE) up

sm: .init_setup
	@$(CMD) $(FLAG) $(COMPOSE_FILE) up -d

start:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) start

stop:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) stop

re: .init_setup
	@$(CMD) $(FLAG) $(COMPOSE_FILE) up --build

.secrets:
	echo "Generating secret files"
	mkdir -p $(SECRETS_DIR)

.decrypt:
	echo "Decrypting secrets file..."
	openssl enc -d -aes256 -salt -pbkdf2 -iter 100000 \
	-in $(ENC_FILE) -out $(OAUTH_FILE) -pass file:$(OAUTH_KEY)
	./srcs/setup.sh

.data_grafana:
	echo "Generating data directories"
	mkdir -p $(DATA_GRAFANA)

.env:
	echo "Generating .env file"
	cp $(ENV_TMP_FILE) $(ENV_FILE)
	sed -i "s|USER_NAME=#|USER_NAME=$(USER_NAME)|g" $(ENV_FILE)
	sed -i "s|SECRETS_DIR=#|SECRETS_DIR=$(SECRETS_DIR)|g" $(ENV_FILE)
	sed -i "s|GRAFANA_DATA_DIR=#|GRAFANA_DATA_DIR=$(DATA_GRAFANA)|g" $(ENV_FILE)

.init_setup:
	@if [ ! -f $(ENV_FILE) ]; then \
		$(MAKE) -s .env; \
	fi
	@if [ ! -d $(SECRETS_DIR) ]; then \
		$(MAKE) -s .secrets; \
	fi
	@if [ ! -f "$(OAUTH_FILE)" ] && [ -f "$(OAUTH_KEY)" ]; then \
		echo "Secrets provided proceeding with decryption"; \
		$(MAKE) -s .decrypt; \
	fi
	@if [ ! -d $(DATA_GRAFANA) ]; then \
		$(MAKE) -s .data_grafana; \
	fi
	echo "Initial setup completed!"

clean:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) down -v
	@if [ -f $(ENV_FILE) ]; then \
		echo "Removing .env file..."; \
		rm -rf $(ENV_FILE); \
    fi
	@if [ -f $(OAUTH_FILE) ]; then \
		echo "Removing secrets.yml..."; \
		rm -rf $(OAUTH_FILE); \
    fi
	@if [ -d $(SECRETS_DIR) ]; then \
		echo "Removing secrets directory..."; \
		rm -rf $(SECRETS_DIR); \
    fi

fclean: clean
	@docker system prune -af
	@if [ -d $(DATA_GRAFANA) ]; then \
		echo "Removing grafana data directory..."; \
		sudo rm -rf $(DATA_GRAFANA); \
	fi

.PHONY: all compose start stop re clean fclean
