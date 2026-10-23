package openai_test

import (
	"errors"
	"testing"

	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/stretchr/testify/require"
)

// The setup probe's own request shape: a tool, temperature zero and reasoning
// off. A reasoning model whose page names no effort literal is sent to
// /responses with neither sampling member nor a reasoning member, because the
// vendor answers temperature on it with a 400 even when no effort is requested.
func TestUnit_WireOpenAI_ResponsesOmitsSamplingForEffortlessReasoningModel(t *testing.T) {
	t.Parallel()
	cs := newCaptureServer(t, scriptedReply{Body: `{"status":"completed","output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"ok"}]}],"usage":{"input_tokens":75,"output_tokens":26,"total_tokens":101}}`})
	provider := openAIChatProvider(t, cs, "gpt-5-nano", modelrepo.CapabilityConfig{CanThink: true})

	_, err := chatOnce(t, provider, modelrepo.WithTemperature(0), modelrepo.WithTopP(1), modelrepo.WithThink("off"), modelrepo.WithTool(probeTool()))
	require.NoError(t, err)
	req := cs.lastRequest(t)
	require.Equal(t, "/responses", req.Path)
	require.NotContains(t, req.Body, "temperature")
	require.NotContains(t, req.Body, "top_p")
	require.NotContains(t, req.Body, "reasoning")
}

// A reasoning model whose page names none keeps sampling when no effort is
// requested: the vendor accepts temperature on it without a reasoning member.
func TestUnit_WireOpenAI_ResponsesKeepsSamplingWhenNoneIsTheDefault(t *testing.T) {
	t.Parallel()
	cs := newCaptureServer(t, scriptedReply{Body: `{"status":"completed","output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"ok"}]}]}`})
	provider := openAIChatProvider(t, cs, "gpt-5.1", modelrepo.CapabilityConfig{})

	_, err := chatOnce(t, provider, modelrepo.WithTemperature(0), modelrepo.WithTool(probeTool()))
	require.NoError(t, err)
	req := cs.lastRequest(t)
	require.Equal(t, "/responses", req.Path)
	require.Equal(t, float64(0), req.Body["temperature"])
	require.NotContains(t, req.Body, "reasoning")
}

// The vendor's refusal of a sampling member carries a null code beside its
// type; the typed error names that type and the vendor's own message.
func TestUnit_WireOpenAI_ResponsesUnsupportedParameterNamesTheVendorMessage(t *testing.T) {
	t.Parallel()
	cs := newCaptureServer(t, scriptedReply{Status: 400, Body: `{"error":{"message":"Unsupported parameter: 'temperature' is not supported with this model.","type":"invalid_request_error","param":"temperature","code":null}}`})
	provider := openAIChatProvider(t, cs, "gpt-5-nano", modelrepo.CapabilityConfig{CanThink: true})

	_, err := chatOnce(t, provider)
	require.Error(t, err)
	var providerErr *modelrepo.ProviderError
	require.True(t, errors.As(err, &providerErr))
	require.Equal(t, 400, providerErr.StatusCode)
	require.Equal(t, "invalid_request_error", providerErr.Code)
	require.Equal(t, "Unsupported parameter: 'temperature' is not supported with this model.", providerErr.Message)
}

func probeTool() modelrepo.Tool {
	return modelrepo.Tool{Type: "function", Function: &modelrepo.FunctionTool{
		Name:        "contenox_ready",
		Description: "Verify AI setup and return a confirmation code.",
		Parameters:  map[string]any{"type": "object", "properties": map[string]any{"status": map[string]any{"type": "string", "enum": []string{"ok"}}}, "required": []string{"status"}, "additionalProperties": false},
	}}
}
