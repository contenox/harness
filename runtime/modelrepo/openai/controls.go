package openai

import (
	"time"

	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/modelrepo/codec/chatcompletions"
)

// cacheRetentionExtended is the documented lifetime that keeps a cached prefix
// active for up to a day; anything shorter is the organisation-default policy.
const cacheRetentionExtended = 24 * time.Hour

// applyOpenAIChatControls puts the neutral request settings on the
// chat/completions body. A setting the model's own page does not support is
// refused here rather than dropped, so the operator sees which level the model
// accepts instead of a request that quietly asks for another one.
func applyOpenAIChatControls(req *openAIChatRequest, modelName string, cfg *modelrepo.ChatConfig, thinking *modelrepo.ThinkingTypes, supportsThink bool) error {
	req.Temperature = cfg.Temperature
	req.MaxCompletionTokens = cfg.MaxTokens
	req.TopP = cfg.TopP
	req.Seed = cfg.Seed
	req.Stop = cfg.StopSequences
	req.ParallelToolCalls = cfg.ParallelToolCalls
	req.ResponseFormat = chatResponseFormat(cfg.Format)
	req.PromptCacheKey, req.PromptCacheRetention = cacheControls(cfg.CacheHints)

	if supportsThink {
		effort, err := openAIReasoningEffort(modelName, cfg.Think, thinking)
		if err != nil {
			return err
		}
		req.ReasoningEffort = effort
	}

	if openAIShouldOmitSamplingParams(modelName, req.ReasoningEffort) {
		req.Temperature = nil
		req.TopP = nil
	}
	return nil
}

// chatResponseFormat renders the neutral structured-output control as the
// chat/completions response_format member; the text mode constrains nothing and
// is left off the wire. The member is the codec's own type, so the two paths
// cannot disagree about its shape.
func chatResponseFormat(format *modelrepo.ResponseFormat) any {
	if format == nil || format.Mode == modelrepo.ResponseFormatText {
		return nil
	}
	wire := &chatcompletions.ResponseFormat{Type: string(format.Mode)}
	if format.Mode == modelrepo.ResponseFormatJSONSchema {
		wire.JSONSchema = &chatcompletions.JSONSchema{
			Name:   format.Name,
			Schema: format.Schema,
			Strict: format.Strict,
		}
	}
	return wire
}

// chatToolChoice renders the neutral tool selection as the documented union of
// the string form and the named-function object. A named tool is emitted under
// the sanitized name the tool list carries, so the selection points at a
// declared function.
func chatToolChoice(choice *modelrepo.ToolChoice, sanitized map[string]string) any {
	if choice == nil {
		return nil
	}
	if choice.Tool == "" {
		return string(choice.Mode)
	}
	name := sanitized[choice.Tool]
	if name == "" {
		name = sanitizeToolName(choice.Tool)
	}
	return &chatcompletions.NamedToolChoice{
		Type:     "function",
		Function: chatcompletions.NamedToolChoiceName{Name: name},
	}
}

// responsesText renders the neutral structured-output control as the Responses
// API's text.format member, whose json_schema members sit beside the type
// instead of inside a json_schema object. The text mode constrains nothing and
// is left off the wire.
func responsesText(format *modelrepo.ResponseFormat) *openAIResponsesText {
	if format == nil || format.Mode == modelrepo.ResponseFormatText {
		return nil
	}
	wire := &openAIResponsesTextFormat{Type: string(format.Mode)}
	if format.Mode == modelrepo.ResponseFormatJSONSchema {
		strict := format.Strict
		wire.Name = format.Name
		wire.Schema = format.Schema
		wire.Strict = &strict
	}
	return &openAIResponsesText{Format: wire}
}

// responsesToolChoice renders the neutral tool selection in this endpoint's flat
// object form, which names the function beside the type. A named tool is emitted
// under the sanitized name the tool list carries, so the selection points at a
// declared function.
func responsesToolChoice(choice *modelrepo.ToolChoice, sanitized map[string]string) any {
	if choice == nil {
		return nil
	}
	if choice.Tool == "" {
		return string(choice.Mode)
	}
	name := sanitized[choice.Tool]
	if name == "" {
		name = sanitizeToolName(choice.Tool)
	}
	return &openAIResponsesToolChoiceName{Type: "function", Name: name}
}

// cacheControls maps the neutral cache hints onto the two documented members:
// the shard key, and the retention policy when the hints state a lifetime. The
// vendor defines a maximum retention policy rather than a minimum, so a
// lifetime shorter than the extended one is stated as in-memory and a zero
// lifetime is left unset.
func cacheControls(hints *modelrepo.CacheHints) (key, retention string) {
	if hints == nil {
		return "", ""
	}
	if hints.TTL >= cacheRetentionExtended {
		return hints.SessionKey, "24h"
	}
	if hints.TTL > 0 {
		return hints.SessionKey, "in_memory"
	}
	return hints.SessionKey, ""
}
