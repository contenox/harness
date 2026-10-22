package runtimestate

import (
	_ "github.com/contenox/harness/runtime/modelrepo/anthropic"
	_ "github.com/contenox/harness/runtime/modelrepo/bedrock"
	_ "github.com/contenox/harness/runtime/modelrepo/gemini"
	_ "github.com/contenox/harness/runtime/modelrepo/mistral"
	_ "github.com/contenox/harness/runtime/modelrepo/ollama"
	_ "github.com/contenox/harness/runtime/modelrepo/openai"
	_ "github.com/contenox/harness/runtime/modelrepo/openrouter"
	_ "github.com/contenox/harness/runtime/modelrepo/vertex"
	_ "github.com/contenox/harness/runtime/modelrepo/vllm"
)

// Import vendor catalog providers for registry-based modelrepo catalog construction.
