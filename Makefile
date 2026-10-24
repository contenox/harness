PROJECT_ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
NPM ?= npm
NODE_OPTIONS ?= --max-old-space-size=4096
export NODE_OPTIONS

.PHONY: help install install-web desktop-install build build-ui build-harness test test-ui test-harness test-acp-client typecheck lint runtime-fetch dev desktop\:dev desktop-dev desktop-stage desktop-verify desktop-checksums desktop-package-dir desktop-package website-dev website-build ci clean

help:
	@echo "install          install web and desktop dependencies"
	@echo "install-web      install web dependencies"
	@echo "build            build UI and harness"
	@echo "test             run UI, harness and acp-client tests"
	@echo "typecheck        typecheck harness"
	@echo "lint             lint harness"
	@echo "runtime-fetch    download and verify the pinned runtime"
	@echo "desktop-install  install Electron dependencies"
	@echo "desktop-dev      run the Electron desktop app"
	@echo "desktop-stage    stage runtime and harness UI for packaging"
	@echo "desktop-verify   verify the unpacked desktop package"
	@echo "desktop-checksums write SHA256SUMS for host installers"
	@echo "desktop-package-dir  build an unpacked desktop app"
	@echo "desktop-package  build host installers"
	@echo "dev              alias for desktop-dev"
	@echo "website-dev      website dev server"
	@echo "website-build    build website and docs"
	@echo "ci               install, build, typecheck, lint, test"
	@echo "clean            remove build and runtime output"

install: install-web desktop-install

install-web:
	$(NPM) --prefix $(PROJECT_ROOT)packages/ui ci
	$(NPM) --prefix $(PROJECT_ROOT)packages/harness ci
	$(NPM) --prefix $(PROJECT_ROOT)packages/acp-client ci
	$(NPM) --prefix $(PROJECT_ROOT)website ci

build: build-ui build-harness

build-ui:
	$(NPM) --prefix $(PROJECT_ROOT)packages/ui run build

build-harness: build-ui
	$(NPM) --prefix $(PROJECT_ROOT)packages/harness run build

test: test-ui test-harness test-acp-client

test-ui:
	$(NPM) --prefix $(PROJECT_ROOT)packages/ui test -- --project unit

test-harness:
	$(NPM) --prefix $(PROJECT_ROOT)packages/harness test

test-acp-client:
	$(NPM) --prefix $(PROJECT_ROOT)packages/acp-client test

typecheck:
	$(NPM) --prefix $(PROJECT_ROOT)packages/harness run typecheck

lint:
	$(NPM) --prefix $(PROJECT_ROOT)packages/harness run lint

runtime-fetch:
	node $(PROJECT_ROOT)scripts/fetch-runtime.mjs

desktop-install:
	$(NPM) --prefix $(PROJECT_ROOT)desktop ci
	node $(PROJECT_ROOT)desktop/node_modules/electron/install.js

desktop-dev: runtime-fetch desktop-install
	$(NPM) --prefix $(PROJECT_ROOT)desktop run dev

dev: desktop-dev

desktop\:dev: desktop-dev

desktop-stage: build runtime-fetch desktop-install
	$(NPM) --prefix $(PROJECT_ROOT)desktop run stage

desktop-verify:
	$(NPM) --prefix $(PROJECT_ROOT)desktop run verify:package

desktop-checksums:
	$(NPM) --prefix $(PROJECT_ROOT)desktop run checksums

desktop-package-dir: desktop-stage
	$(NPM) --prefix $(PROJECT_ROOT)desktop run package:dir
	$(NPM) --prefix $(PROJECT_ROOT)desktop run verify:package

desktop-package: desktop-stage
	$(NPM) --prefix $(PROJECT_ROOT)desktop run package
	$(NPM) --prefix $(PROJECT_ROOT)desktop run verify:package
	$(NPM) --prefix $(PROJECT_ROOT)desktop run checksums

desktop\:package: desktop-package

website-dev:
	$(NPM) --prefix $(PROJECT_ROOT)website run dev

website-build:
	$(NPM) --prefix $(PROJECT_ROOT)website run build

ci: install-web build typecheck lint test

clean:
	rm -rf $(PROJECT_ROOT)packages/ui/dist $(PROJECT_ROOT)packages/harness/dist $(PROJECT_ROOT)desktop/node_modules $(PROJECT_ROOT).runtime $(PROJECT_ROOT)website/dist
