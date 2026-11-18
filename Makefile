all: build

deps:
	npm ci

build:
	npm run build

lint:
	npm run lint

typecheck:
	npm run typecheck

test: test-js test-py

test-js:
	npm test

test-py:
	python3 -m unittest discover -s tests/installer
	python3 -m unittest discover -s tests/packaging
	python3 -m unittest discover -s tests/live

check: lint typecheck test build

live:
	npm run live

clean:
	rm -rf dist

.PHONY: all deps build lint typecheck test test-js test-py check live clean
