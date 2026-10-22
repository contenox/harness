PROJECT_ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
.DEFAULT_GOAL := help

# Optional local environment. This lets ignored repo-local `.env` files provide
# release-store settings and AWS_REGION.
LOCAL_ENV_FILE := $(PROJECT_ROOT).env
ifneq (,$(wildcard $(LOCAL_ENV_FILE)))
include $(LOCAL_ENV_FILE)
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)[[:space:]]*=.*/\1/p' $(LOCAL_ENV_FILE))
endif

EMBED_MODEL ?= nomic-embed-text:latest
EMBED_PROVIDER ?= ollama
EMBED_MODEL_CONTEXT_LENGTH ?= 2048
TASK_MODEL ?= phi3:3.8b
TASK_MODEL_CONTEXT_LENGTH ?= 2048
TASK_PROVIDER ?= ollama
CHAT_MODEL ?= phi3:3.8b
CHAT_PROVIDER ?= ollama
CHAT_MODEL_CONTEXT_LENGTH ?= 2048
TENANCY ?= 54882f1d-3788-44f9-aed6-19a793c4568f
OLLAMA_HOST ?= 127.0.0.1:11434

export EMBED_MODEL EMBED_PROVIDER EMBED_MODEL_CONTEXT_LENGTH
export TASK_MODEL TASK_MODEL_CONTEXT_LENGTH TASK_PROVIDER
export CHAT_MODEL CHAT_MODEL_CONTEXT_LENGTH CHAT_PROVIDER
export TENANCY
export OLLAMA_HOST

DEV_CONTENOX_BIN := $(HOME)/.local/bin/contenox
UI_DIR := $(PROJECT_ROOT)/packages/ui
HARNESS_DIR := $(PROJECT_ROOT)/packages/harness
HARNESS_DEV_HOST ?= 127.0.0.1
HARNESS_DEV_PORT ?= 5173
HARNESS_DEV_PROXY_URL ?= http://127.0.0.1:$(HARNESS_DEV_PORT)
CONTENOX_DEV_ADDR ?= 127.0.0.1
CONTENOX_DEV_PORT ?= 32123
CONTENOX_DEV_URL ?= http://$(CONTENOX_DEV_ADDR):$(CONTENOX_DEV_PORT)

.PHONY: help \
	deps-website dev-website build-website preview-website \
	openapi \
	build-contenox build-contenox-windows build-ui \
	\
	\
	\
	clean \
	deps-ui \
	dev-harness dev-web-proxy dev-install dev-link dev-unlink \
	\
	test test-all test-unit test-api test-ui test-vllm test-system test-contenox-verbose test-contenox-help \
	tool-eval \
	acp-conformance acp-client-e2e acp-host-e2e \
	verify-ui-embed visual

help:
	@echo "build-*    build-contenox build-contenox-windows build-ui"
	@echo "test-*     test test-all test-unit test-api test-ui test-vllm test-system test-contenox-verbose test-contenox-help"
	@echo "           (test-all = the one-command release gate: builds ui/cli/website, then unit, ui, cli-help, api, acp-conformance, acp-client-e2e, acp-host-e2e, full go test)"
	@echo "tool-eval  gated per-model tool-eval matrix (opt-in; CONTENOX_RUN_TOOL_EVALS=1; see comment above the target)"
	@echo "acp-conformance  validate libacp's agent-side wire dispatch against Rust reference ACP clients (needs ACP_VALIDATOR_BIN, see Makefile comment)"
	@echo "acp-client-e2e   validate libacp's client-side wire dispatch against the Rust reference testy agent over a real subprocess (needs ACP_TESTY_BIN, see Makefile comment)"
	@echo "acp-host-e2e     validate the composed registry→host path (runtime/agenthost) end to end: contenox self-loopback always; testy/claude too when ACP_TESTY_BIN/ACP_CLAUDE_ACP_BIN are set (see Makefile comment)"
	@echo "dev-*      dev-harness dev-web-proxy dev-install dev-link dev-unlink"
	@echo "deps-*     deps-ui"
	@echo "           (checks/pulls the expected native dep bundle from the store)"
	@echo "verify-*   verify-ui-embed"
	@echo "Version (maintainers): make -f Makefile.version help"
	@echo "clean"

# Regenerate the OpenAPI spec (runtime/internal/openapidocs/openapi.json) from
# the route annotations. Run after changing any HTTP route or its @request/
# @response/@param annotations; the result is embedded into the binary.
openapi:
	go run $(PROJECT_ROOT)/tools/openapi-gen

# build
# Build the pure-Go CLI.
build-contenox: verify-ui-embed
	CGO_ENABLED=0 go build -o $(PROJECT_ROOT)/bin/contenox $(PROJECT_ROOT)/cmd/contenox

build-contenox-windows: verify-ui-embed
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o $(PROJECT_ROOT)/bin/contenox-windows-amd64.exe $(PROJECT_ROOT)/cmd/contenox

build-ui: deps-ui
	cd $(UI_DIR) && npm run build
	cd $(HARNESS_DIR) && npm run build

test:
	GOMAXPROCS=1 go test -C $(PROJECT_ROOT) -timeout 30m ./...

# The one-command release gate: build every shippable artifact on this host and
# run every suite that can run here, fast gates first, the full serial Go suite
# last. The ACP harness legs run against the in-repo Rust peers (see the
# ACP_*_BIN defaults above); they fail with a set-this-var message rather than
# silently skipping when a peer was never built — a release gate must not
# quietly shrink.
test-all: build-ui build-contenox build-website
	$(MAKE) --no-print-directory test-unit
	$(MAKE) --no-print-directory test-ui
	$(MAKE) --no-print-directory test-contenox-help
	$(MAKE) --no-print-directory test-api
	$(MAKE) --no-print-directory acp-conformance
	$(MAKE) --no-print-directory acp-client-e2e
	$(MAKE) --no-print-directory acp-host-e2e
	$(MAKE) --no-print-directory test
	@echo "==> test-all: all gates green"

test-unit:
	GOMAXPROCS=4 go test -C $(PROJECT_ROOT) -short -timeout 15m -run '^TestUnit_' ./...

test-vllm:
	CONTENOX_RUN_VLLM_TESTS=1 GOMAXPROCS=1 go test -C $(PROJECT_ROOT) -run '^TestSystem_VLLM' ./runtime/modelrepo

# tool-eval: the incident-driven, per-model tool-eval matrix
# (docs/development/blueprints/tool-hardening.md, "The eval harness"). Like test-vllm
# it is OPT-IN and gated so CI and default `go test` stay hermetic; the harness's own
# plumbing is covered by the ungated TestUnit_ToolEval_* self-tests (a scripted model,
# no backend). This target runs the LIVE matrix against a configured local model,
# driving the real localtools pipeline and the real toolguidance envelope through one
# agentic loop, and scoring two axes per model x scenario: task success (an invariant,
# never a tool-call sequence) and first-attempt tool-format compliance (malformed-rate,
# its own column — rec 10). Results are STOCHASTIC measurements, not build gates: the
# suite records seed/temperature and never fails on a model's task outcome.
# Env vars:
#   CONTENOX_RUN_TOOL_EVALS=1   required to run (else the suite Skips with a teaching message)
#   CONTENOX_TOOL_EVAL_MODEL    model id      (default qwen2.5:0.5b)
#   CONTENOX_TOOL_EVAL_PROVIDER provider type (default ollama)
#   CONTENOX_TOOL_EVAL_URL      backend URL   (default http://127.0.0.1:11434)
#   CONTENOX_TOOL_EVAL_REPEATS  N runs per required scenario (default 1; the -count knob)
#   CONTENOX_TOOL_EVAL_OUT      results dir   (default bin/; a timestamped JSON lands there)
# A run needs the model up and pulled (e.g. `ollama serve && ollama pull qwen2.5:0.5b`);
# with nothing reachable the suite probes and Skips cleanly.
tool-eval:
	CONTENOX_RUN_TOOL_EVALS=1 CONTENOX_TOOL_EVAL_OUT=$(PROJECT_ROOT)/bin GOMAXPROCS=1 \
		go test -C $(PROJECT_ROOT) -v -timeout 30m -run '^TestSystem_ToolEval' ./runtime/tooleval

test-system:
	GOMAXPROCS=1 go test -C $(PROJECT_ROOT) -run '^TestSystem_' ./...

test-api: build-ui
	$(MAKE) --no-print-directory build-contenox
	@CONTENOX_BIN=$(PROJECT_ROOT)/bin/contenox $(PROJECT_ROOT)/scripts/run_apitests.sh $(PYTEST_ARGS)

test-ui: deps-ui
	cd $(HARNESS_DIR) && npm run typecheck
	cd $(HARNESS_DIR) && npm test

visual:
	bash $(PROJECT_ROOT)/packages/harness/e2e/run.sh

verify-ui-embed:
	@test -f "$(PROJECT_ROOT)/runtime/internal/web/beam/dist/index.html" || { echo "missing Beam dist; run: make build-ui"; exit 1; }
	go test -C $(PROJECT_ROOT) ./runtime/internal/web

test-contenox-verbose:
	GOMAXPROCS=4 go test -C $(PROJECT_ROOT) -v ./runtime/contenoxcli/...

test-contenox-help: build-contenox
	@chmod +x $(PROJECT_ROOT)/scripts/verify_cli_help.sh
	@CONTENOX_BIN=$(PROJECT_ROOT)/bin/contenox $(PROJECT_ROOT)/scripts/verify_cli_help.sh

# ACP conformance harness (Slice 6): validates libacp's agent-side wire dispatch
# (conn.go/agent.go — NewAgentSideConnection's initialize/session/prompt/cancel
# handling) against the Rust reference ACP client implementations, driving the
# hermetic libacp/cmd/acp-stub-agent instead of a real LLM backend. Both tests
# skip with a clear message when their env var is unset.
# ACP_VALIDATOR_BIN: build the acp-validator crate vendored at
#   tools/acp-validator (see its README: it needs a sibling checkout of the
#   agentclientprotocol rust-sdk); the build lands at
#   <crate dir>/target/debug/acp-validator.
# ACP_YOPO_BIN: build the `yopo` binary from the agentclientprotocol rust-sdk
#   (src/yopo); e.g. <rust-sdk checkout>/target/debug/yopo.
# Default every ACP peer to its in-repo build when that binary exists, so the
# conformance targets run with zero manual env on a checkout that has built
# them (tools/acp-validator README, rust-sdk at tools/rust-sdk). Explicit env
# still overrides; a missing binary leaves the var empty and the target keeps
# its clear set-this-var failure/skip behavior.
ACP_VALIDATOR_BIN ?= $(wildcard $(PROJECT_ROOT)tools/acp-validator/target/debug/acp-validator)
ACP_YOPO_BIN ?= $(wildcard $(PROJECT_ROOT)tools/rust-sdk/target/debug/yopo)

acp-conformance:
	@test -n "$(ACP_VALIDATOR_BIN)" || { echo "set ACP_VALIDATOR_BIN=/path/to/acp-validator (see Makefile comment above test-contenox-help)"; exit 1; }
	ACP_VALIDATOR_BIN=$(ACP_VALIDATOR_BIN) ACP_YOPO_BIN=$(ACP_YOPO_BIN) ACP_STUB_ADVERTISE_MODES=1 go test -C $(PROJECT_ROOT) -run '^TestConformance_' -v ./libacp/...

# ACP client e2e harness (Slice 3): validates libacp's client-side wire
# dispatch (client.go/clientconn.go — ClientSideConnection's outbound
# initialize/session/prompt calls and its handling of agent-initiated
# requests + session/update) against testy, the Rust reference SDK's
# deterministic test agent, spoken to over a real subprocess
# (libacp/acpexec). Gated on ACP_TESTY_BIN; the MCP pass-down test is
# additionally gated on ACP_MCP_ECHO_BIN and skips on its own if unset.
# ACP_TESTY_BIN: build the `testy` binary from the agentclientprotocol
#   rust-sdk (src/agent-client-protocol-test); e.g. a local checkout builds it
#   at <checkout>/target/debug/testy.
# ACP_MCP_ECHO_BIN: build the `mcp-echo-server` binary from the same crate;
#   e.g. <checkout>/target/debug/mcp-echo-server.
ACP_TESTY_BIN ?= $(wildcard $(PROJECT_ROOT)tools/rust-sdk/target/debug/testy)
ACP_MCP_ECHO_BIN ?= $(wildcard $(PROJECT_ROOT)tools/rust-sdk/target/debug/mcp-echo-server)

acp-client-e2e:
	@test -n "$(ACP_TESTY_BIN)" || { echo "set ACP_TESTY_BIN=/path/to/testy (see Makefile comment above acp-client-e2e)"; exit 1; }
	ACP_TESTY_BIN=$(ACP_TESTY_BIN) ACP_MCP_ECHO_BIN=$(ACP_MCP_ECHO_BIN) go test -C $(PROJECT_ROOT) -run '^TestTesty_' -v ./libacp/acpexec/...

# ACP host e2e harness: validates the composed client-host path one layer above
# acp-client-e2e — registry row → resolve → runtime/agenthost spawn →
# initialize → session/new → session/prompt → teardown (see
# docs/development/blueprints/acp/agent-servers-and-client-e2e.md). Servers:
#   - contenox self-loopback: builds the contenox binary in-test and drives a
#     deterministic no-model chain fixture; always runs (no env var needed).
#   - ACP_TESTY_BIN: additionally drives the Rust reference testy agent through
#     the composed path (build it as documented above acp-client-e2e); those
#     tests skip cleanly when unset.
#   - ACP_CLAUDE_ACP_BIN: additionally drives a real Claude Code agent over ACP —
#     point it at an executable serving it, e.g. a wrapper script:
#       #!/bin/sh
#       unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT
#       exec npx -y @zed-industries/claude-code-acp "$$@"
#     (the unset matters when running from inside a Claude Code session: the
#     spawned claude refuses to nest under an inherited CLAUDECODE.)
#     Needs Claude credentials (logged-in claude or ANTHROPIC_API_KEY); replies
#     are asserted by shape only. Never set this in CI.
ACP_CLAUDE_ACP_BIN ?=

acp-host-e2e:
	ACP_TESTY_BIN=$(ACP_TESTY_BIN) ACP_MCP_ECHO_BIN=$(ACP_MCP_ECHO_BIN) ACP_CLAUDE_ACP_BIN=$(ACP_CLAUDE_ACP_BIN) go test -C $(PROJECT_ROOT) -run '^TestHostE2E_' -v ./runtime/agenthost/...

# dev
dev-harness:
	@test -d "$(HARNESS_DIR)/node_modules" || { echo "missing Beam node_modules; run: make deps-ui"; exit 1; }
	@set -eu; \
	cd "$(HARNESS_DIR)" && VITE_DEV_API_PROXY=1 VITE_DEV_PROXY_TARGET="$(CONTENOX_DEV_URL)" npm run dev -- --host "$(HARNESS_DEV_HOST)" --port "$(HARNESS_DEV_PORT)" --strictPort & \
	vite_pid=$$!; \
	trap 'kill $$vite_pid 2>/dev/null || true; wait $$vite_pid 2>/dev/null || true' EXIT INT TERM; \
	sleep 1; \
	if ! kill -0 $$vite_pid 2>/dev/null; then wait $$vite_pid; exit $$?; fi; \
	echo "Harness dev UI: $(HARNESS_DEV_PROXY_URL)"; \
	echo "contenox serve API/UI proxy: $(CONTENOX_DEV_URL)"; \
	HARNESS_DEV_PROXY_URL="$(HARNESS_DEV_PROXY_URL)" ADDR="$(CONTENOX_DEV_ADDR)" PORT="$(CONTENOX_DEV_PORT)" \
		go run $(PROJECT_ROOT)/cmd/contenox serve

dev-web-proxy: dev-harness

dev-install: build-contenox dev-link

dev-link: build-contenox
	@mkdir -p $(dir $(DEV_CONTENOX_BIN))
	@ln -sf $(PROJECT_ROOT)/bin/contenox $(DEV_CONTENOX_BIN)
	@echo "Linked $(DEV_CONTENOX_BIN) -> $(PROJECT_ROOT)/bin/contenox"
	@echo "Use this binary: ensure $(dir $(DEV_CONTENOX_BIN)) is on PATH before other contenox installs (check: which contenox)"

dev-unlink:
	@rm -f $(DEV_CONTENOX_BIN)

deps-ui:
	cd $(UI_DIR) && npm ci
	cd $(HARNESS_DIR) && npm ci

deps-website:
	cd $(PROJECT_ROOT)/website && npm ci

dev-website:
	cd $(PROJECT_ROOT)/website && npm run dev

build-website:
	cd $(PROJECT_ROOT)/website && npm run build

preview-website: build-website
	cd $(PROJECT_ROOT)/website && npm run preview

# clean
clean:
	rm -rf $(PROJECT_ROOT)/bin

