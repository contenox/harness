package gemini

import (
	"encoding/json"

	"github.com/contenox/harness/runtime/modelrepo"
)

type geminiToolRequest struct {
	FunctionDeclarations []geminiFunctionDeclaration `json:"functionDeclarations,omitempty"`
}

type geminiFunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

type geminiFunctionResponse struct {
	Name     string                 `json:"name"`
	Response map[string]interface{} `json:"response"`
}

type geminiPart struct {
	Text             string                  `json:"text,omitempty"`
	Thought          bool                    `json:"thought,omitempty"`
	ThoughtSignature string                  `json:"thoughtSignature,omitempty"`
	InlineData       *geminiInlineData       `json:"inlineData,omitempty"`
	FunctionCall     *geminiFunctionCall     `json:"functionCall,omitempty"`
	FunctionResponse *geminiFunctionResponse `json:"functionResponse,omitempty"`
}

type geminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     []byte `json:"data"`
}

type geminiContent struct {
	Role  string       `json:"role"`
	Parts []geminiPart `json:"parts"`
}

type geminiSystemInstruction struct {
	Parts []geminiPart `json:"parts"`
}

type geminiGenerateContentResponse struct {
	Candidates []struct {
		Content      geminiContent `json:"content"`
		FinishReason string        `json:"finishReason,omitempty"`
	} `json:"candidates"`
	PromptFeedback struct {
		BlockReason string `json:"blockReason,omitempty"`
	} `json:"promptFeedback"`
	UsageMetadata *geminiUsageMetadata `json:"usageMetadata,omitempty"`
}

type geminiUsageMetadata struct {
	PromptTokenCount        int `json:"promptTokenCount"`
	CandidatesTokenCount    int `json:"candidatesTokenCount"`
	ThoughtsTokenCount      int `json:"thoughtsTokenCount"`
	TotalTokenCount         int `json:"totalTokenCount"`
	CachedContentTokenCount int `json:"cachedContentTokenCount"`
}

func (u *geminiUsageMetadata) neutralUsage() *modelrepo.TokenUsage {
	if u == nil {
		return nil
	}
	total := u.TotalTokenCount
	if total == 0 {
		total = u.PromptTokenCount + u.CandidatesTokenCount + u.ThoughtsTokenCount
	}
	return &modelrepo.TokenUsage{
		PromptTokens:     u.PromptTokenCount,
		CompletionTokens: u.CandidatesTokenCount + u.ThoughtsTokenCount,
		ThinkingTokens:   u.ThoughtsTokenCount,
		TotalTokens:      total,
		CacheReadTokens:  u.CachedContentTokenCount,
	}
}

type geminiFunctionDeclaration struct {
	Name string `json:"name"`
	// Description is the vendor's required human-readable description.
	Description string `json:"description,omitempty"`
	// ParametersJsonSchema is the caller's JSON Schema verbatim. The vendor
	// documents it as the full JSON Schema form and as mutually exclusive with
	// the OpenAPI-subset `parameters` member, so a schema this adapter would
	// have had to trim is sent whole instead.
	ParametersJsonSchema json.RawMessage `json:"parametersJsonSchema,omitempty"`
}

// geminiContinuation is the response content this adapter replays on the next
// turn: a Gemini thought signature lives inside the part it was returned on
// (a text part as much as a functionCall part), so the parts are kept verbatim
// rather than rebuilt from the neutral message.
type geminiContinuation struct {
	Parts []geminiPart `json:"parts"`
}

// continuationProvider identifies content this adapter stored for replay.
const continuationProvider = "gemini"

// thoughtSignatureMetaKey is the ToolCall.ProviderMeta key a response part's
// thought signature round-trips under.
const thoughtSignatureMetaKey = "thought_signature"

// skipThoughtSignatureValidator is the vendor's documented thought_signature
// value for a functionCall part the API did not generate and that therefore has
// no signature to return, such as history carried over from another model.
const skipThoughtSignatureValidator = "skip_thought_signature_validator"

// replayContinuation decodes a stored turn for this provider and model.
func replayContinuation(continuation *modelrepo.Continuation, modelName string) ([]geminiPart, bool) {
	if continuation == nil || continuation.Provider != continuationProvider || continuation.Model != modelName {
		return nil, false
	}
	var stored geminiContinuation
	if err := json.Unmarshal(continuation.Items, &stored); err != nil {
		return nil, false
	}
	if len(stored.Parts) == 0 {
		return nil, false
	}
	return stored.Parts, true
}

// responseContinuation stores a response's parts for verbatim replay.
func responseContinuation(modelName string, parts []geminiPart) *modelrepo.Continuation {
	if len(parts) == 0 {
		return nil
	}
	raw, err := json.Marshal(geminiContinuation{Parts: parts})
	if err != nil {
		return nil
	}
	return &modelrepo.Continuation{Provider: continuationProvider, Model: modelName, Items: raw}
}
