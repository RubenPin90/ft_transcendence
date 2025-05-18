CMD := docker compose
FLAG := -f

ROOT_DIR := $(shell pwd)
SRC_DIR := $(ROOT_DIR)/srcs
COMPOSE_FILE := $(SRC_DIR)/docker-compose.yml
ENV_FILE := $(SRC_DIR)/.env
ENV_TMP_FILE := $(SRC_DIR)/.env.example

USER_NAME := $(shell whoami)
SECRETS_DIR := $(ROOT_DIR)/secrets
DATA_GRAFANA := $(SRC_DIR)/monitoring/grafana

all: compose

compose: .init_setup
	@$(CMD) $(FLAG) $(COMPOSE_FILE) up

start:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) start

stop:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) stop

re: .init_setup
	@$(CMD) $(FLAG) $(COMPOSE_FILE) up --build

.secrets:
	echo "Generating secret files"
	mkdir -p $(SECRETS_DIR)
	openssl rand -base64 24 > $(SECRETS_DIR)/prometheus.txt
	openssl rand -base64 24 > $(SECRETS_DIR)/grafana.txt
	echo "Successfully created all password files"

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
	@if [ ! -d $(DATA_GRAFANA) ]; then \
		$(MAKE) -s .data_grafana; \
	fi

clean:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) down -v
	@if [ -f $(ENV_FILE) ]; then \
		echo "Removing .env file..."; \
		rm -rf $(ENV_FILE); \
    fi
	@if [ -d $(SECRETS_DIR) ]; then \
		echo "Removing secrets directory..."; \
		rm -rf $(SECRETS_DIR); \
    fi

fclean: clean
	@docker system prune -af

.PHONY: all compose start stop re clean fclean
