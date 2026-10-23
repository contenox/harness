// Package mistral adapts Mistral's chat, fill-in-the-middle and catalogue
// endpoints to the runtime's neutral provider contract.
package mistral

import (
	"fmt"

	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/reasoning"
)

// dialectName is the wire dialect every model this backend lists speaks, and
// the key the dialect registers under.
const dialectName = "mistral"

// dialectDocURL is the Mistral request reference every member this dialect
// names is checked against.
const dialectDocURL = "https://docs.mistral.ai/api/endpoint/chat"

// maxTemperature is the highest sampling temperature the chat and FIM request
// references accept; a higher value is a request the vendor rejects.
const maxTemperature = 1.5

// Mistral's documented reasoning_effort literals. The chat reference declares
// none and high; the model pages add low and max for the models that accept
// them, which a model's own declaration carries here.
const (
	reasoningEffortNone = "none"
	reasoningEffortLow  = "low"
	reasoningEffortHigh = "high"
	reasoningEffortMax  = "max"
)

// dialect restates the shared OpenAI-compatible request body in Mistral's own
// spelling. Mistral declares `additionalProperties: false` on its chat request,
// so a member it does not document is a 422 rather than an ignored field.
type dialect struct{}

func (dialect) Name() string { return dialectName }

func (dialect) DocURL() string { return dialectDocURL }

// OwnsReasoning reports that Mistral's reasoning_effort enum is not the shared
// OpenAI mapping; this dialect writes the member itself.
func (dialect) OwnsReasoning() bool { return true }

// RewriteBody restates the request in Mistral's spelling: max_tokens carries the
// output ceiling, random_seed the sampling seed, a tool's parameters member is
// present because the reference requires it, and the members Mistral does not
// declare are removed.
func (d dialect) RewriteBody(body map[string]any, req modelrepo.DialectRequest) error {
	if _, ok := body["max_completion_tokens"]; ok {
		if _, declared := body["max_tokens"]; !declared {
			body["max_tokens"] = body["max_completion_tokens"]
		}
		delete(body, "max_completion_tokens")
	}
	if seed, ok := body["seed"]; ok {
		body["random_seed"] = seed
		delete(body, "seed")
	}
	if err := checkTemperature(body["temperature"]); err != nil {
		return err
	}
	// Mistral reports usage on the last chunk of a stream without being asked,
	// and declares neither member.
	delete(body, "stream_options")
	delete(body, "reasoning_effort")
	ensureToolParameters(body)

	effort, err := reasoningEffort(req)
	if err != nil {
		return err
	}
	if effort != "" {
		body["reasoning_effort"] = effort
	}
	return nil
}

// ThinkingMember reports that Mistral carries a reasoning trace inside the
// assistant message's content chunks, not in a sibling member.
func (dialect) ThinkingMember(modelrepo.DialectRequest) string { return "" }

// WireAssistantMessage folds a replayed reasoning trace into the content chunk
// array Mistral documents for a reasoning turn, so a later turn carries the
// full assistant message back rather than only its answer.
func (dialect) WireAssistantMessage(content, thinking string) (modelrepo.WireMessage, error) {
	if thinking == "" {
		return nil, nil
	}
	chunks := []map[string]any{
		{"type": "thinking", "thinking": []map[string]any{{"type": "text", "text": thinking}}},
	}
	if content != "" {
		chunks = append(chunks, map[string]any{"type": "text", "text": content})
	}
	return modelrepo.WireMessage{"content": chunks}, nil
}

// checkTemperature refuses a sampling temperature above the reference's
// documented maximum instead of sending a value the vendor rejects.
func checkTemperature(raw any) error {
	temperature, ok := raw.(float64)
	if !ok || temperature <= maxTemperature {
		return nil
	}
	return fmt.Errorf("mistral accepts a temperature of at most %v, got %v", maxTemperature, temperature)
}

// ensureToolParameters gives every declared function the parameters member
// Mistral's reference marks required, so a tool the caller declared without a
// schema is a parameterless function rather than a rejected request. A schema
// the caller supplied is left untouched.
func ensureToolParameters(body map[string]any) {
	tools, ok := body["tools"].([]any)
	if !ok {
		return
	}
	for _, raw := range tools {
		tool, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		function, ok := tool["function"].(map[string]any)
		if !ok {
			continue
		}
		if _, declared := function["parameters"]; !declared {
			function["parameters"] = map[string]any{"type": "object", "properties": map[string]any{}}
		}
	}
}

// reasoningEffort maps a runtime level onto the reasoning_effort value Mistral
// publishes for the model: none turns reasoning off, and every enabled level is
// one of the low, high and max literals the model's own declaration names.
// Without a declaration the vendor's chat reference is the authority, which
// declares none and high alone.
func reasoningEffort(req modelrepo.DialectRequest) (string, error) {
	level, err := req.ThinkLevel()
	if err != nil {
		return "", err
	}
	switch level {
	case "":
		return "", nil
	case reasoning.Off:
		if req.Thinking == nil || req.Thinking.Disabled {
			return reasoningEffortNone, nil
		}
		return "", &modelrepo.UnsupportedDialectLevelError{Dialect: dialectName, Level: level}
	}
	if req.Thinking == nil || len(req.Thinking.EffortLevels) == 0 {
		return reasoningEffortHigh, nil
	}
	effort := mistralEffortLiteral(level)
	if !req.AllowsEffort(effort) {
		return "", &modelrepo.UnsupportedDialectLevelError{Dialect: dialectName, Level: level}
	}
	return effort, nil
}

// mistralEffortLiteral is the vendor literal a runtime level maps onto: the
// documented mapping collapses minimal and low onto low, medium and high onto
// high, and keeps max.
func mistralEffortLiteral(level string) string {
	switch level {
	case reasoning.Minimal, reasoning.Low:
		return reasoningEffortLow
	case reasoning.Max:
		return reasoningEffortMax
	default:
		return reasoningEffortHigh
	}
}

func init() {
	modelrepo.RegisterChatDialect(dialect{})
}
