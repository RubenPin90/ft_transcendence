CMD := docker compose
FLAG := -f

ROOT_DIR := $(shell pwd)
SRC_DIR := $(ROOT_DIR)/srcs
COMPOSE_FILE := $(SRC_DIR)/docker-compose.yml

all: detached

compose:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) up

start:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) start

stop:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) stop

re:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) up --build

clean:
	@$(CMD) $(FLAG) $(COMPOSE_FILE) down -v

fclean: clean
	@docker system prune -af

.PHONY: all compose start stop re clean fclean
