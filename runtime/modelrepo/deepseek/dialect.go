// Package deepseek adapts DeepSeek's chat, beta fill-in-the-middle and
// catalogue endpoints to the runtime's neutral provider contract.
package deepseek

import (
	"fmt"

	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/reasoning"
)

// dialectName is the wire dialect every model this backend lists speaks, and
// the key the dialect registers under.
const dialectName = "deepseek"

// dialectDocURL is the DeepSeek request reference every member this dialect
// names is checked against.
const dialectDocURL = "https://api-docs.deepseek.com/api/create-chat-completion"

// thinkingMember is the assistant-message member DeepSeek reads a reasoning
// model's own trace back from, and requires back in full on every request that
// carries tools.
const thinkingMember = "reasoning_content"

// DeepSeek's documented thinking toggle: the vendor enables thinking by
// default, and only these two types are declared for the member.
const (
	thinkingTypeDisabled = "disabled"
	thinkingTypeEnabled  = "enabled"
)

// dialect restates the shared OpenAI-compatible request body in DeepSeek's own
// spelling, and carries the thinking control the runtime's neutral level maps
// onto.
type dialect struct{}

func (dialect) Name() string { return dialectName }

func (dialect) DocURL() string { return dialectDocURL }

// OwnsReasoning reports that DeepSeek's thinking controls are its own
// vocabulary, not the shared reasoning_effort mapping.
func (dialect) OwnsReasoning() bool { return true }

// RewriteBody restates the request in DeepSeek's spelling: max_tokens carries
// the output ceiling, thinking turns thinking on or off, and the members
// DeepSeek does not declare are removed. DeepSeek documents no seed and no
// prompt_cache_key; its own cache-affinity member is user_id.
func (d dialect) RewriteBody(body map[string]any, req modelrepo.DialectRequest) error {
	if _, ok := body["max_completion_tokens"]; ok {
		if _, declared := body["max_tokens"]; !declared {
			body["max_tokens"] = body["max_completion_tokens"]
		}
		delete(body, "max_completion_tokens")
	}
	delete(body, "seed")
	delete(body, "prompt_cache_key")

	if req.CacheHints != nil && req.CacheHints.SessionKey != "" {
		body["user_id"] = req.CacheHints.SessionKey
	}

	thinking, effort, err := d.thinkingControl(req)
	if err != nil {
		return err
	}
	if thinking != nil {
		body["thinking"] = thinking
	}
	delete(body, "reasoning_effort")
	if effort != "" {
		body["reasoning_effort"] = effort
	}
	if err := checkStructuredOutput(body["response_format"]); err != nil {
		return err
	}
	return checkToolChoice(body["tool_choice"], thinkingActive(req, thinking))
}

// ThinkingMember is the member DeepSeek requires a reasoning turn's trace back
// in on a request that carries tools; the vendor documents that a request
// without tools ignores the trace entirely.
func (dialect) ThinkingMember(req modelrepo.DialectRequest) string {
	if !req.Tools {
		return ""
	}
	return thinkingMember
}

// WireAssistantMessage leaves the assistant turn in its plain content form;
// DeepSeek carries the reasoning trace beside the content, not inside it.
func (dialect) WireAssistantMessage(string, string) (modelrepo.WireMessage, error) { return nil, nil }

// thinkingControl maps the runtime's level onto DeepSeek's toggle and effort
// members. Thinking is enabled by default at high effort, so a caller who named
// no level is left with the vendor default and only a caller who named one is
// restated; the off level is the vendor's own disable toggle.
func (d dialect) thinkingControl(req modelrepo.DialectRequest) (map[string]any, string, error) {
	level, err := req.ThinkLevel()
	if err != nil {
		return nil, "", err
	}
	switch level {
	case "":
		return nil, "", nil
	case reasoning.Off:
		if req.Thinking != nil && !req.Thinking.Disabled {
			return nil, "", &modelrepo.UnsupportedDialectLevelError{Dialect: dialectName, Level: level}
		}
		return map[string]any{"type": thinkingTypeDisabled}, "", nil
	}
	effort := deepseekEffortLiteral(level)
	if !req.AllowsEffort(effort) {
		return nil, "", &modelrepo.UnsupportedDialectLevelError{Dialect: dialectName, Level: level}
	}
	return map[string]any{"type": thinkingTypeEnabled}, effort, nil
}

// deepseekEffortLiteral is the vendor literal a runtime level maps onto, using
// the mapping the vendor publishes: minimal and low become low, medium and
// xhigh become high, and max stays max.
func deepseekEffortLiteral(level string) string {
	switch level {
	case reasoning.Minimal, reasoning.Low:
		return reasoning.Low
	case reasoning.Max:
		return reasoning.Max
	default:
		return reasoning.High
	}
}

// thinkingActive is the thinking state the request runs with: the toggle a
// named level wrote, or, when the caller named no level, the vendor default of
// thinking enabled on every model whose declaration says it can think. A model
// that declares no thinking control runs with none.
func thinkingActive(req modelrepo.DialectRequest, thinking map[string]any) map[string]any {
	if thinking != nil {
		return thinking
	}
	if req.Thinking.Controls() {
		return map[string]any{"type": thinkingTypeEnabled}
	}
	return nil
}

// checkStructuredOutput refuses a schema-constrained response format: DeepSeek
// declares text and json_object alone, so a json_schema request is one the
// vendor rejects rather than one it ignores.
func checkStructuredOutput(raw any) error {
	format, ok := raw.(map[string]any)
	if !ok {
		return nil
	}
	if kind, _ := format["type"].(string); kind == "json_schema" {
		return fmt.Errorf("deepseek declares no json_schema response format; use json_object")
	}
	return nil
}

// checkToolChoice refuses the tool selections DeepSeek documents as invalid
// while thinking is on. The vendor enables thinking by default, so a required
// or named selection is legal only on a request that turns it off.
func checkToolChoice(raw any, thinking map[string]any) error {
	if raw == nil || thinking == nil {
		return nil
	}
	if kind, _ := thinking["type"].(string); kind != thinkingTypeEnabled {
		return nil
	}
	switch choice := raw.(type) {
	case string:
		if choice == string(modelrepo.ToolChoiceRequired) {
			return fmt.Errorf("deepseek rejects the required tool choice while thinking is enabled; turn thinking off for this request")
		}
	case map[string]any:
		return fmt.Errorf("deepseek rejects a named tool choice while thinking is enabled; turn thinking off for this request")
	}
	return nil
}

func init() {
	modelrepo.RegisterChatDialect(dialect{})
}
