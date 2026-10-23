package modelrepo

import "context"

type Provider interface {
	GetBackendIDs() []string
	ModelName() string
	GetID() string
	GetType() string
	GetContextLength() int
	// GetMaxOutputTokens returns the provider's hard ceiling on output tokens; 0 means unknown or unlimited.
	GetMaxOutputTokens() int
	CanChat() bool
	CanEmbed() bool
	CanStream() bool
	CanPrompt() bool
	CanAutocomplete() bool
	// CanNextEdit reports whether the model declares independent edit prediction.
	CanNextEdit() bool
	CanThink() bool
	// CanVision reports whether the model accepts image input.
	CanVision() bool
	// CanAudio reports whether the model accepts audio input.
	CanAudio() bool
	GetChatConnection(ctx context.Context, backendID string) (LLMChatClient, error)
	GetPromptConnection(ctx context.Context, backendID string) (LLMPromptExecClient, error)
	GetAutocompleteConnection(ctx context.Context, backendID string) (LLMAutocompleteClient, error)
	// GetNextEditConnection binds the model's declared edit profile to its backend.
	GetNextEditConnection(ctx context.Context, backendID string) (LLMNextEditClient, error)
	GetEmbedConnection(ctx context.Context, backendID string) (LLMEmbedClient, error)
	GetStreamConnection(ctx context.Context, backendID string) (LLMStreamClient, error)
}

type CapabilityConfig struct {
	// CompletionMode declares the code-completion operation supported by this model.
	CompletionMode string
	// FIMFormat identifies the declared native autocomplete token contract.
	FIMFormat       string
	CanAutocomplete bool
	// NextEditFormat identifies the declared independent edit protocol.
	NextEditFormat string
	CanNextEdit    bool
	ContextLength  int
	// MaxOutputTokens is the provider's hard ceiling on output tokens; 0 means unknown, no clamp applied.
	MaxOutputTokens int
	CanChat         bool
	CanEmbed        bool
	CanStream       bool
	CanPrompt       bool
	CanThink        bool
	// CanVision marks models that accept image input.
	CanVision bool
	// CanAudio marks models that accept audio input.
	CanAudio bool
	// AudioExtension marks an endpoint that declared the `audios` extension.
	AudioExtension bool
	// SessionExtension marks an endpoint that declared the `session` extension,
	// so a conversation may be named on the request and the endpoint will keep
	// its turns on one backend.
	SessionExtension bool
	// ThinkingTypes is what the model's own model list declares about its
	// thinking controls; nil means the endpoint declared none, so a dialect
	// falls back to the control whose absence is legal for it rather than
	// inferring one from the model name.
	ThinkingTypes *ThinkingTypes
	// Dialect names the vendor wire dialect this model's endpoint speaks, as a
	// catalog reader observed it. Empty is the OpenAI-compatible defaults:
	// max_completion_tokens, seed, and stream_options. A named dialect restates
	// the request in that vendor's documented spelling instead.
	Dialect string
	// PromptCache is what the model's own declaration says about prompt-cache
	// checkpoints; nil means none was declared, so a dialect places no
	// checkpoint rather than one the model's vendor may reject.
	PromptCache *PromptCacheContract
}

// PromptCacheContract is a model's declared prompt-cache checkpoint contract:
// the request fields whose content accepts a checkpoint and the cache lifetimes
// the model accepts. A field or lifetime absent from the declaration is one the
// vendor does not document for that model, and an adapter neither sends it nor
// infers it from a model name.
type PromptCacheContract struct {
	// Fields are the request fields accepting a checkpoint: any of
	// PromptCacheFieldTools, PromptCacheFieldSystem, PromptCacheFieldMessages.
	Fields []string `json:"fields,omitempty"`
	// TTLs are the accepted cache lifetimes: any of PromptCacheTTLFiveMinutes,
	// PromptCacheTTLOneHour.
	TTLs []string `json:"ttls,omitempty"`
}

// Neutral prompt-cache checkpoint field names.
const (
	PromptCacheFieldTools    = "tools"
	PromptCacheFieldSystem   = "system"
	PromptCacheFieldMessages = "messages"
)

// Neutral prompt-cache lifetime names, spelled as the vendor spells them on the wire.
const (
	PromptCacheTTLFiveMinutes = "5m"
	PromptCacheTTLOneHour     = "1h"
)

// SupportsField reports whether the declaration names field.
func (c *PromptCacheContract) SupportsField(field string) bool {
	if c == nil {
		return false
	}
	for _, f := range c.Fields {
		if f == field {
			return true
		}
	}
	return false
}

// SupportsTTL reports whether the declaration names ttl.
func (c *PromptCacheContract) SupportsTTL(ttl string) bool {
	if c == nil {
		return false
	}
	for _, t := range c.TTLs {
		if t == ttl {
			return true
		}
	}
	return false
}
