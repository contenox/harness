package modelrepo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/contenox/harness/runtime/reasoning"
)

// ErrRefused is returned when the model refuses to generate a response
// (stop_reason == "refusal"), typically due to a safety filter. A vendor's own
// refusal text wraps it, so errors.Is stays the test and the reason is readable.
var ErrRefused = errors.New("model refused the request")

// RefusalError is a vendor-declared refusal: the provider served a response and
// declined to answer it. Code is the vendor's category and Text its explanation,
// either of which may be empty; the message goes to a reader, never a parser.
type RefusalError struct {
	Provider string
	Code     string
	Text     string
}

// Error renders the vendor's own refusal reason when it gave one.
func (e *RefusalError) Error() string {
	s := "model refused the request"
	if e.Provider != "" {
		s += " (" + e.Provider + ")"
	}
	if e.Code != "" {
		s += " (" + e.Code + ")"
	}
	if e.Text != "" {
		s += ": " + e.Text
	}
	return s
}

// Unwrap exposes ErrRefused, so errors.Is stays the test for a refusal.
func (e *RefusalError) Unwrap() error { return ErrRefused }

// ToolResultErrorKey is the ProviderMeta key on a tool message that declares the
// tool call failed, so a dialect with an explicit flag sends the model a result
// it can tell apart from an empty success.
const ToolResultErrorKey = "tool_result_is_error"

// ThinkingTypes is a model's declared thinking controls, named as the vendor
// that publishes them names them: which thinking configuration types the model
// accepts, and at which effort levels. A capability absent from a declaration
// is one the model rejects, never one the runtime may infer from a model name.
type ThinkingTypes struct {
	// Adaptive is whether the model accepts a thinking configuration that lets
	// it decide when and how much to think.
	Adaptive bool `json:"adaptive"`
	// Enabled is whether the model accepts a caller-set thinking budget.
	Enabled bool `json:"enabled"`
	// Disabled is whether the model accepts thinking turned off; false is the
	// vendor saying a request that turns thinking off is rejected.
	Disabled bool `json:"disabled"`
	// EffortLevels are the effort levels the model accepts, in any order.
	EffortLevels []string `json:"effortLevels,omitempty"`
}

// SupportsEffort reports whether the declaration names level.
func (t *ThinkingTypes) SupportsEffort(level string) bool {
	if t == nil {
		return false
	}
	for _, l := range t.EffortLevels {
		if l == level {
			return true
		}
	}
	return false
}

// Controls reports whether the declaration names any thinking configuration the
// model accepts, which is what separates a model that cannot reason from one
// that reasons without being asked.
func (t *ThinkingTypes) Controls() bool {
	return t != nil && (t.Adaptive || t.Enabled || t.Disabled)
}

// Validate reports a declaration naming an effort level the runtime does not
// know, so a mistake in a catalogue reader surfaces at the declaration rather
// than as a request the vendor rejects.
func (t *ThinkingTypes) Validate() error {
	if t == nil {
		return nil
	}
	for _, level := range t.EffortLevels {
		switch level {
		case reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh, reasoning.Max:
		default:
			return fmt.Errorf("thinking declaration names unknown effort level %q", level)
		}
	}
	return nil
}

// MaxStopSequences is the largest stop-sequence list every chat dialect
// accepts; a request over it is refused rather than silently truncated.
const MaxStopSequences = 4

type ChatResult struct {
	Message   Message
	ToolCalls []ToolCall
	// Usage is the provider-reported token accounting for this non-streaming call; nil means unreported.
	Usage *TokenUsage
	// FinishReason is the provider's raw finish reason, verbatim, or empty if unreported.
	FinishReason string
	// Refusal is the vendor's own refusal detail when the finish reason is a
	// refusal; the provider returns ErrRefused alongside it rather than a result.
	Refusal string
}

type ToolCall struct {
	ID       string `json:"id,omitempty"`
	Type     string `json:"type"` // only "function" for now
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
	// ProviderMeta carries opaque provider data that must round-trip on the
	// next turn (e.g. Gemini thought_signature).
	ProviderMeta map[string]string `json:"provider_meta,omitempty"`
}

// ImagePart is a binary image attachment carried beside a message's text; Data holds raw bytes, MimeType the media type.
type ImagePart struct {
	Data     []byte `json:"data"`
	MimeType string `json:"mime_type"`
}

// AudioPart is a binary audio attachment carried beside a message's text, shaped like ImagePart.
type AudioPart struct {
	Data     []byte `json:"data"`
	MimeType string `json:"mime_type"`
}

// Message is a chat turn; assistant messages may carry ToolCalls, tool
// messages carry ToolCallID (OpenAI/vLLM-compatible tool calling).
type Message struct {
	Continuation *Continuation `json:"continuation,omitempty"`
	Role         string        `json:"role"`
	Content      string        `json:"content"`
	// Images carries image attachments beside Content; routed only to providers reporting CanVision.
	Images []ImagePart `json:"images,omitempty"`
	// Audio carries audio attachments beside Content; routed only to providers reporting CanAudio.
	Audio []AudioPart `json:"audio,omitempty"`
	// Thinking is the model's reasoning trace, populated only when thinking
	// is enabled, and never sent back to the model.
	Thinking string `json:"thinking,omitempty"`
	// Refusal is the vendor's own explanation when it declined to answer; it
	// accompanies ErrRefused, and is empty for every other turn.
	Refusal string `json:"refusal,omitempty"`

	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
	// ToolResultError marks a tool message whose call failed, so a dialect with
	// an explicit flag sends the model a failure it can tell from an empty
	// success. It is meaningless on any other role.
	ToolResultError bool `json:"tool_result_error,omitempty"`
}

// MessagesHaveImages reports whether any message carries an image
// attachment, for deriving the vision requirement at resolution time.
func MessagesHaveImages(messages []Message) bool {
	for _, m := range messages {
		if len(m.Images) > 0 {
			return true
		}
	}
	return false
}

// MessagesImageCount is how many image attachments a request carries, which is
// what a turn against a per-image rate card is charged for: a provider that
// bills images apart from tokens reports the tokens but never the count.
func MessagesImageCount(messages []Message) int {
	count := 0
	for _, m := range messages {
		count += len(m.Images)
	}
	return count
}

// MessagesHaveAudio reports whether any message carries an audio attachment,
// for deriving the audio requirement at resolution time.
func MessagesHaveAudio(messages []Message) bool {
	for _, m := range messages {
		if len(m.Audio) > 0 {
			return true
		}
	}
	return false
}

type ChatArgument interface {
	Apply(config *ChatConfig)
}

// ToolCallDelta is one raw streamed tool-call fragment; fragments sharing an Index belong to the same call and assemble via StreamAssembler.
type ToolCallDelta struct {
	Index        int
	ID           string
	Type         string
	Name         string
	ArgsFragment string
	// ProviderMeta carries opaque provider data that must round-trip on the
	// next turn (e.g. Gemini thought_signature).
	ProviderMeta map[string]string
}

// TokenUsage is provider-reported token accounting; zero fields mean not
// reported. PromptTokens includes cached tokens, CompletionTokens includes
// thinking tokens, and ThinkingTokens is the reported thinking subset.
type TokenUsage struct {
	PromptTokens     int
	CompletionTokens int
	ThinkingTokens   int
	TotalTokens      int
	// CacheReadTokens is prompt tokens served from the provider's prefix cache; zero where unsupported.
	CacheReadTokens int
	// CacheWriteTokens is prompt tokens written to the provider's cache this request; zero where unsupported.
	CacheWriteTokens int
}

// StreamTerminal is the typed terminal event of a stream: the provider's
// verbatim finish reason plus final usage when reported there.
type StreamTerminal struct {
	Continuation *Continuation
	FinishReason string
	Usage        *TokenUsage
	// Refusal is the vendor's own explanation when the terminal finish reason is
	// a refusal; the provider turns a terminal that carries one into ErrRefused,
	// so a streamed refusal is an outcome and not merely a finish reason.
	Refusal string
	// StopSequence is the caller's stop sequence the model matched, reported
	// only when the finish reason says generation stopped on one.
	StopSequence string
	// Terminated reports that the provider's own end-of-stream marker was
	// observed, which several dialects send after the finish reason. A terminal
	// that reports neither a finish reason nor a marker is the end of a
	// connection that died mid-turn, which is a truncated stream.
	Terminated bool
}

// Continuation carries opaque response items for replay only to the originating provider and model.
type Continuation struct {
	Provider string          `json:"provider"`
	Model    string          `json:"model"`
	Items    json.RawMessage `json:"items"`
}

// StreamParcel is one raw provider-stream delta, with exactly one field populated per parcel; a stream ends with one Terminal parcel or one Error parcel.
type StreamParcel struct {
	// Data is a visible output-text delta.
	Data string
	// Thinking is a streamed reasoning delta, separate from Data; never sent back as conversation history.
	Thinking string
	ToolCall *ToolCallDelta
	// Usage is a provider usage report emitted mid-stream (some providers
	// report prompt tokens at stream start, completion tokens at the end).
	Usage *TokenUsage
	// Terminal is the typed end-of-stream event: finish reason + final usage.
	Terminal *StreamTerminal
	Error    error
}

type Tool struct {
	Type     string        `json:"type"`
	Function *FunctionTool `json:"function,omitempty"`
}

type FunctionTool struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Parameters  interface{} `json:"parameters,omitempty"`
}

// CacheHints tells a provider where a request's stable/volatile boundary lies for native cache controls; a hint must never change what the model sees, only cache metadata.
type CacheHints struct {
	// SessionKey is an opaque, already-hashed per-session cache-affinity key; never a raw internal ID.
	SessionKey string
	// StableSystem asserts the system instruction is byte-stable across the
	// session, i.e. safe to place a cache breakpoint after it.
	StableSystem bool
	// StableTools asserts the tool list (order and encoding) is byte-stable
	// across the session.
	StableTools bool
	// StableHistoryLen is the number of leading history messages asserted
	// unchanged since the previous request (0 = no assertion).
	StableHistoryLen int
	// TTL is an advisory cache lifetime for providers with explicit TTLs; zero means the provider default.
	TTL time.Duration
}

// ToolChoiceMode names a tool-selection policy that every dialect with tool
// calling documents.
type ToolChoiceMode string

const (
	// ToolChoiceAuto lets the model decide whether to call a tool.
	ToolChoiceAuto ToolChoiceMode = "auto"
	// ToolChoiceNone forbids tool calls for this request.
	ToolChoiceNone ToolChoiceMode = "none"
	// ToolChoiceRequired forces at least one tool call.
	ToolChoiceRequired ToolChoiceMode = "required"
)

// ToolChoice is the neutral tool-selection policy: a mode, or Mode with Tool
// naming the one function the model must call.
type ToolChoice struct {
	Mode ToolChoiceMode
	// Tool is the unsanitized function name to force; empty means the mode alone.
	Tool string
}

// Validate reports a choice that no dialect can express.
func (t ToolChoice) Validate() error {
	switch t.Mode {
	case ToolChoiceAuto, ToolChoiceNone:
		if t.Tool != "" {
			return fmt.Errorf("tool choice %q does not select a named tool", t.Mode)
		}
	case ToolChoiceRequired:
	default:
		return fmt.Errorf("invalid tool choice mode %q (valid: auto, none, required)", t.Mode)
	}
	return nil
}

// ResponseFormatMode names the structured-output constraint of a request.
type ResponseFormatMode string

const (
	// ResponseFormatText constrains nothing; output is ordinary text.
	ResponseFormatText ResponseFormatMode = "text"
	// ResponseFormatJSONObject requires syntactically valid JSON without a schema.
	ResponseFormatJSONObject ResponseFormatMode = "json_object"
	// ResponseFormatJSONSchema requires JSON conforming to Schema.
	ResponseFormatJSONSchema ResponseFormatMode = "json_schema"
)

// ResponseFormat is the neutral structured-output control: a mode plus, for
// ResponseFormatJSONSchema, the schema the output must satisfy.
type ResponseFormat struct {
	Mode ResponseFormatMode
	// Name identifies the schema to the dialects that require a name.
	Name string
	// Schema is the JSON Schema document; required by ResponseFormatJSONSchema.
	Schema any
	// Strict asks the provider to reject output that does not conform exactly.
	Strict bool
}

// Validate reports a format no dialect can express.
func (f ResponseFormat) Validate() error {
	switch f.Mode {
	case ResponseFormatText, ResponseFormatJSONObject:
	case ResponseFormatJSONSchema:
		if f.Schema == nil {
			return errors.New("json_schema response format requires a schema")
		}
	default:
		return fmt.Errorf("invalid response format %q (valid: text, json_object, json_schema)", f.Mode)
	}
	return nil
}

type ChatConfig struct {
	Temperature *float64 `json:"temperature,omitempty"`
	MaxTokens   *int     `json:"max_tokens,omitempty"`
	TopP        *float64 `json:"top_p,omitempty"`
	Seed        *int     `json:"seed,omitempty"`
	Tools       []Tool   `json:"tools,omitempty"`
	// Think controls reasoning-model behaviour; nil uses the provider default (auto, off, minimal, low, medium, high, xhigh, max).
	Think *string `json:"think,omitempty"`
	// StopSequences bounds generation at the provider: generation ends when the
	// model emits any one of them, and that sequence is not part of the output.
	StopSequences []string `json:"stop_sequences,omitempty"`
	// ToolChoice selects which tool the model may call; nil leaves the
	// provider default in place.
	ToolChoice *ToolChoice `json:"tool_choice,omitempty"`
	// ParallelToolCalls permits more than one tool call per turn; nil leaves
	// the provider default in place and true is that same default.
	ParallelToolCalls *bool `json:"parallel_tool_calls,omitempty"`
	// Format constrains the response to a JSON shape; nil leaves the provider
	// default, which is unconstrained text.
	Format *ResponseFormat `json:"response_format,omitempty"`
	// Shift instructs the provider to slide the context window on overflow
	// instead of returning a token-limit error.
	Shift *bool `json:"shift,omitempty"`
	// Truncate instructs the provider to truncate history on overflow.
	Truncate *bool `json:"truncate,omitempty"`
	// CacheHints declares this request's stable/volatile boundary for provider-side prompt caching; nil changes nothing, never serialized.
	CacheHints *CacheHints `json:"-"`
}

// Validate reports the first setting whose value no provider can be given.
func (c *ChatConfig) Validate() error {
	if c == nil {
		return nil
	}
	if c.MaxTokens != nil && *c.MaxTokens <= 0 {
		return fmt.Errorf("max tokens must be positive, got %d", *c.MaxTokens)
	}
	if c.Temperature != nil && (math.IsNaN(*c.Temperature) || math.IsInf(*c.Temperature, 0)) {
		return fmt.Errorf("temperature must be a finite number, got %v", *c.Temperature)
	}
	if c.TopP != nil && (math.IsNaN(*c.TopP) || math.IsInf(*c.TopP, 0) || *c.TopP <= 0 || *c.TopP > 1) {
		return fmt.Errorf("top_p must be in (0, 1], got %v", *c.TopP)
	}
	if len(c.StopSequences) > MaxStopSequences {
		return fmt.Errorf("at most %d stop sequences are supported, got %d", MaxStopSequences, len(c.StopSequences))
	}
	for _, s := range c.StopSequences {
		if s == "" {
			return errors.New("a stop sequence must not be empty")
		}
	}
	if c.ToolChoice != nil {
		if err := c.ToolChoice.Validate(); err != nil {
			return err
		}
	}
	if c.Format != nil {
		if err := c.Format.Validate(); err != nil {
			return err
		}
	}
	if c.ParallelToolCalls != nil && c.ToolChoice != nil && c.ToolChoice.Mode == ToolChoiceNone && *c.ParallelToolCalls {
		return errors.New("parallel tool calls cannot be enabled when tool choice is none")
	}
	return nil
}

// PromptConfig contains bounded generation settings for a one-shot prompt.
type PromptConfig struct {
	// MaxTokens is the request's output-token ceiling; nil leaves provider defaults in place.
	MaxTokens *int
}

// PromptArgument applies one setting to a one-shot prompt request.
type PromptArgument interface {
	Apply(*PromptConfig)
}

// WithPromptMaxTokens sets the maximum number of generated tokens for a one-shot prompt.
type WithPromptMaxTokens int

// Apply sets the prompt output-token limit.
func (w WithPromptMaxTokens) Apply(config *PromptConfig) {
	maxTokens := int(w)
	config.MaxTokens = &maxTokens
}

// PromptConfigFromArgs applies prompt arguments and rejects missing or invalid limits.
func PromptConfigFromArgs(args ...PromptArgument) (*PromptConfig, error) {
	config := &PromptConfig{}
	for _, arg := range args {
		if arg == nil {
			return nil, errors.New("prompt argument is required")
		}
		arg.Apply(config)
	}
	if config.MaxTokens != nil && *config.MaxTokens <= 0 {
		return nil, fmt.Errorf("prompt max tokens must be positive, got %d", *config.MaxTokens)
	}
	return config, nil
}

// WithThink is a ChatArgument that enables/controls reasoning mode.
type WithThink string

func (w WithThink) Apply(cfg *ChatConfig) {
	s := string(w)
	cfg.Think = &s
}

// WithShift is a ChatArgument that enables context shift on overflow.
type WithShift struct{}

func (WithShift) Apply(cfg *ChatConfig) {
	t := true
	cfg.Shift = &t
}

type LLMChatClient interface {
	Chat(ctx context.Context, messages []Message, args ...ChatArgument) (ChatResult, error)
}

type LLMEmbedClient interface {
	Embed(ctx context.Context, prompt string) ([]float64, error)
}

type LLMStreamClient interface {
	Stream(ctx context.Context, messages []Message, args ...ChatArgument) (<-chan *StreamParcel, error)
}

type LLMPromptExecClient interface {
	// Prompt returns the completion text plus the provider-reported token
	// accounting; nil usage means the provider did not report any.
	Prompt(ctx context.Context, systemInstruction string, temperature float32, prompt string, args ...PromptArgument) (string, *TokenUsage, error)
}

// Merge folds a partial provider usage report into cumulative counters.
// Nonzero fields replace earlier values; nil reports leave counters unchanged.
func (u *TokenUsage) Merge(src *TokenUsage) {
	if src == nil {
		return
	}
	if src.PromptTokens != 0 {
		u.PromptTokens = src.PromptTokens
	}
	if src.CompletionTokens != 0 {
		u.CompletionTokens = src.CompletionTokens
	}
	if src.ThinkingTokens != 0 {
		u.ThinkingTokens = src.ThinkingTokens
	}
	if src.TotalTokens != 0 {
		u.TotalTokens = src.TotalTokens
	}
	if src.CacheReadTokens != 0 {
		u.CacheReadTokens = src.CacheReadTokens
	}
	if src.CacheWriteTokens != 0 {
		u.CacheWriteTokens = src.CacheWriteTokens
	}
}
