# Makefile

# Variables
APP_NAME=safeland
GO_CMD=go
GO_BUILD=$(GO_CMD) build
GO_RUN=$(GO_CMD) run
GO_TEST=$(GO_CMD) test
GO_CLEAN=$(GO_CMD) clean
AIR_CMD=air
SWAG_CMD=swag

# Default target
all: help

# Help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  run          Run the application"
	@echo "  dev          Run the application in development mode with live reload"
	@echo "  build        Build the application"
	@echo "  test         Run the tests"
	@echo "  clean        Clean the project"
	@echo "  swagger      Generate swagger documentation"
	@echo "  help         Show this help message"

# Run the application
run: swagger
	$(GO_RUN) main.go

# Run the application in development mode with live reload
dev:
	$(AIR_CMD)

# Build the application
build:
	$(GO_BUILD) -o $(APP_NAME) main.go

# Run the tests
test:
	$(GO_TEST) ./...

# Clean the project
clean:
	$(GO_CLEAN) -testcache
	rm -f $(APP_NAME)
	rm -f air.log

# Generate swagger documentation
swagger:
	$(GO_CMD) run github.com/swaggo/swag/cmd/swag@latest init -g main.go -o docs

.PHONY: all help run dev build test clean swagger