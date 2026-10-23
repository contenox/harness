package runtimestate_test

import (
	"testing"

	"github.com/contenox/harness/runtime/runtimestate"
	"github.com/contenox/harness/runtime/runtimetypes"
	"github.com/stretchr/testify/require"
)

// A connection's own capability list is what the adapter executes unaided; the
// operations that depend on a model's declared format are answered per
// declaration, so no adapter claims an editor operation it was not given a
// format for.
func TestUnit_RegistrationCapabilitiesClaimNoEditorOperationWithoutADeclaration(t *testing.T) {
	for _, backendType := range []string{"openai", "ollama", "vllm", "mistral", "deepseek", "anthropic", "gemini"} {
		capabilities, err := runtimestate.RegistrationCapabilities(runtimetypes.Backend{Type: backendType})
		require.NoError(t, err)
		require.NotContains(t, capabilities, runtimetypes.CapabilityNextEdit, backendType)
		require.NotContains(t, capabilities, runtimetypes.CapabilityAutocomplete, backendType)
	}
}

// A declared edit format is honoured exactly where the adapter speaks it: our
// own edit prompt runs over any adapter that carries an edit client, and is
// refused where the adapter has none, while a native fill-in-the-middle contract
// is the vendor's own.
func TestUnit_DeclaredModelCapabilitiesHonourTheDeclaredFormats(t *testing.T) {
	for _, backendType := range []string{"openai", "ollama", "vllm"} {
		capabilities, err := runtimestate.DeclaredModelCapabilities(runtimetypes.Backend{Type: backendType}, runtimetypes.ModelFacts{
			Capabilities:   []string{runtimetypes.CapabilityCompletion, runtimetypes.CapabilityNextEdit},
			NextEditFormat: "sweep-v1",
		})
		require.NoError(t, err)
		require.Contains(t, capabilities, runtimetypes.CapabilityNextEdit, backendType)
	}
	for _, backendType := range []string{"mistral", "deepseek", "anthropic", "gemini"} {
		capabilities, err := runtimestate.DeclaredModelCapabilities(runtimetypes.Backend{Type: backendType}, runtimetypes.ModelFacts{
			Capabilities:   []string{runtimetypes.CapabilityCompletion, runtimetypes.CapabilityNextEdit},
			NextEditFormat: "sweep-v1",
		})
		require.NoError(t, err)
		require.NotContains(t, capabilities, runtimetypes.CapabilityNextEdit, backendType)
	}

	openaiFIM, err := runtimestate.DeclaredModelCapabilities(runtimetypes.Backend{Type: "openai"}, runtimetypes.ModelFacts{
		Capabilities:   []string{runtimetypes.CapabilityCompletion, runtimetypes.CapabilityAutocomplete},
		CompletionMode: "fim",
		FIMFormat:      "qwen2.5-coder",
	})
	require.NoError(t, err)
	require.Contains(t, openaiFIM, runtimetypes.CapabilityAutocomplete,
		"an OpenAI-compatible adapter speaks the models' declared FIM contracts")

	deepseek, err := runtimestate.DeclaredModelCapabilities(runtimetypes.Backend{Type: "deepseek"}, runtimetypes.ModelFacts{
		Capabilities:   []string{runtimetypes.CapabilityCompletion, runtimetypes.CapabilityAutocomplete},
		CompletionMode: "fim",
		FIMFormat:      "deepseek-fim",
	})
	require.NoError(t, err)
	require.Contains(t, deepseek, runtimetypes.CapabilityAutocomplete, "the deepseek adapter speaks its own FIM contract")

	mistralOnDeepseek, err := runtimestate.DeclaredModelCapabilities(runtimetypes.Backend{Type: "deepseek"}, runtimetypes.ModelFacts{
		Capabilities:   []string{runtimetypes.CapabilityCompletion, runtimetypes.CapabilityAutocomplete},
		CompletionMode: "fim",
		FIMFormat:      "mistral-fim",
	})
	require.NoError(t, err)
	require.NotContains(t, mistralOnDeepseek, runtimetypes.CapabilityAutocomplete,
		"an adapter that does not speak the declared FIM contract must not claim the operation")
}
