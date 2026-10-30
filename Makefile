# Thin alias for the npm scripts: every target runs scripts/tasks.mjs (see `npm run help`).
# Variables map to flags: RUNTIME_BIN=<path>, CONFIRM=yes, DRY_RUN=yes. Needs only Node.
RUNNER := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))scripts/tasks.mjs
FLAGS := $(if $(RUNTIME_BIN),--runtime-bin="$(RUNTIME_BIN)",) $(if $(filter yes,$(CONFIRM)),--yes,) $(if $(filter yes,$(DRY_RUN)),--dry-run,)

TASKS := install install-web install-desktop build build-ui build-harness test test-ui test-harness \
	test-acp-client typecheck lint ci dev stage stage-local package-dir package package-local qa verify \
	checksums sign-rpm runtime-fetch stop clean reset-local-state
OLD_NAMES := desktop-install desktop-dev desktop-stage desktop-stage-local desktop-package-dir \
	desktop-package desktop-package-local desktop-verify desktop-checksums desktop-sign-rpm

.PHONY: help $(TASKS) $(OLD_NAMES)

help:
	@node "$(RUNNER)" help

$(TASKS) $(OLD_NAMES):
	@node "$(RUNNER)" $@ $(FLAGS)
