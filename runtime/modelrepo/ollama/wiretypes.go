package ollama

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"slices"
	"strings"
	"time"

	"github.com/contenox/harness/runtime/modelrepo"
)

// Wire types for the Ollama HTTP API. Every field for which Ollama publishes a
// name carries the vendor's own name, type and marshalling, so a request is one
// the vendor's server accepts. A field named "contenox_…" or documented on the
// declaration as an extension is this repository's addition: it is sent only to
// an endpoint that advertised it, and it never replaces a vendor field.

// Capability is a model capability reported by /api/show.
type Capability string

// Capability values recognized by the catalog. Unlisted values parse fine and
// are ignored.
const (
	CapabilityCompletion = Capability("completion")
	CapabilityTools      = Capability("tools")
	// CapabilityInsert marks a model built with a fill-in-the-middle template,
	// which the server renders itself from a request's prompt and its suffix.
	CapabilityInsert    = Capability("insert")
	CapabilityVision    = Capability("vision")
	CapabilityEmbedding = Capability("embedding")
	CapabilityThinking  = Capability("thinking")
	CapabilityImage     = Capability("image")
	CapabilityAudio     = Capability("audio")
	CapabilityDecision  = Capability("decision")
)

// ImageData is the raw binary content of an image. encoding/json renders it as
// a base64 string, which is the wire representation Ollama expects.
type ImageData []byte

// Duration is a time.Duration that marshals as an Ollama duration string
// ("10m0s") and unmarshals from either that or a number of seconds.
type Duration struct {
	time.Duration
}

// MarshalJSON emits -1 for negative durations (Ollama's "keep loaded forever")
// and a duration string otherwise.
func (d Duration) MarshalJSON() ([]byte, error) {
	if d.Duration < 0 {
		return []byte("-1"), nil
	}
	return []byte("\"" + d.Duration.String() + "\""), nil
}

// UnmarshalJSON accepts a number of seconds or a Go duration string. Negative
// values saturate to the maximum duration; anything unparseable leaves the
// 5-minute server default in place.
func (d *Duration) UnmarshalJSON(b []byte) (err error) {
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}

	d.Duration = 5 * time.Minute

	switch t := v.(type) {
	case float64:
		if t < 0 {
			d.Duration = time.Duration(math.MaxInt64)
		} else {
			d.Duration = time.Duration(t * float64(time.Second))
		}
	case string:
		d.Duration, err = time.ParseDuration(t)
		if err != nil {
			return err
		}
		if d.Duration < 0 {
			d.Duration = time.Duration(math.MaxInt64)
		}
	default:
		return fmt.Errorf("unsupported duration type: '%T'", v)
	}

	return nil
}

// ThinkValue is the "think" request field: a boolean, or a thinking level the
// model defines. The vendor's server validates a level against the model's own
// metadata, so the transport carries any non-empty string and the adapter
// checks it against the declaration before sending.
type ThinkValue struct {
	Value any
}

// MarshalJSON emits the underlying bool or string; a nil value emits null.
func (t *ThinkValue) MarshalJSON() ([]byte, error) {
	if t == nil || t.Value == nil {
		return []byte("null"), nil
	}
	return json.Marshal(t.Value)
}

// UnmarshalJSON accepts the transport forms the vendor's own type accepts:
// absent, a boolean, or a level name. Which names a model honours is that
// model's own /api/show declaration, not this transport's business.
func (t *ThinkValue) UnmarshalJSON(data []byte) error {
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	switch value.(type) {
	case nil, bool, string:
		t.Value = value
		return nil
	default:
		return fmt.Errorf("think must be a boolean or a level name")
	}
}

// ThinkingMetadata is the "thinking" descriptor /api/show reports: the values
// the model accepts, and the one it uses when the request says nothing. A nil
// descriptor means the server declared none.
type ThinkingMetadata struct {
	Values  []any `json:"values"`
	Default any   `json:"default"`
}

// Supports reports whether the descriptor names value as an accepted level.
func (t *ThinkingMetadata) Supports(value any) bool {
	if t == nil {
		return false
	}
	for _, declared := range t.Values {
		if declared == value {
			return true
		}
	}
	return false
}

// Levels lists the declared string levels, in declaration order.
func (t *ThinkingMetadata) Levels() []string {
	if t == nil {
		return nil
	}
	levels := make([]string, 0, len(t.Values))
	for _, value := range t.Values {
		if level, ok := value.(string); ok && level != "" {
			levels = append(levels, level)
		}
	}
	return levels
}

type orderedMap[V any] struct {
	keys   []string
	values map[string]V
}

func newOrderedMap[V any]() *orderedMap[V] {
	return &orderedMap[V]{values: make(map[string]V)}
}

func (m *orderedMap[V]) set(key string, value V) {
	if m.values == nil {
		m.values = make(map[string]V)
	}
	if _, ok := m.values[key]; !ok {
		m.keys = append(m.keys, key)
	}
	m.values[key] = value
}

func (m *orderedMap[V]) MarshalJSON() ([]byte, error) {
	if m == nil || m.values == nil {
		return []byte("null"), nil
	}
	var buf bytes.Buffer
	buf.WriteByte('{')
	for i, key := range m.keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		kb, err := json.Marshal(key)
		if err != nil {
			return nil, err
		}
		buf.Write(kb)
		buf.WriteByte(':')
		vb, err := json.Marshal(m.values[key])
		if err != nil {
			return nil, err
		}
		buf.Write(vb)
	}
	buf.WriteByte('}')
	return buf.Bytes(), nil
}

func (m *orderedMap[V]) UnmarshalJSON(data []byte) error {
	m.keys = nil
	m.values = nil
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		return nil
	}

	dec := json.NewDecoder(bytes.NewReader(data))
	tok, err := dec.Token()
	if err != nil {
		return err
	}
	if delim, ok := tok.(json.Delim); !ok || delim != '{' {
		return fmt.Errorf("expected JSON object, got %v", tok)
	}

	m.values = make(map[string]V)
	for dec.More() {
		keyTok, err := dec.Token()
		if err != nil {
			return err
		}
		key, ok := keyTok.(string)
		if !ok {
			return fmt.Errorf("expected string key, got %v", keyTok)
		}
		var value V
		if err := dec.Decode(&value); err != nil {
			return err
		}
		m.set(key, value)
	}
	if _, err := dec.Token(); err != nil {
		return err
	}
	return nil
}

// Message is one entry in a chat sequence.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	// Thinking is the text the model emitted inside thinking tags when
	// ChatRequest.Think is set.
	Thinking string      `json:"thinking,omitempty"`
	Images   []ImageData `json:"images,omitempty"`
	// Audios carries audio bytes beside Content, in any supported format named
	// from the bytes themselves. The vendor's Message does not
	// define the member: it is the `audios` extension, and the adapter sends it
	// only to an endpoint that declared that extension in its handshake.
	Audios     []ImageData `json:"audios,omitempty"`
	ToolCalls  []ToolCall  `json:"tool_calls,omitempty"`
	ToolName   string      `json:"tool_name,omitempty"`
	ToolCallID string      `json:"tool_call_id,omitempty"`
}

// UnmarshalJSON lowercases Role; servers are inconsistent about its case and
// callers compare against lowercase literals.
func (m *Message) UnmarshalJSON(b []byte) error {
	type Alias Message
	var a Alias
	if err := json.Unmarshal(b, &a); err != nil {
		return err
	}

	*m = Message(a)
	m.Role = strings.ToLower(m.Role)
	return nil
}

// ToolCall is a single tool invocation requested by the model.
type ToolCall struct {
	ID       string           `json:"id,omitempty"`
	Function ToolCallFunction `json:"function"`
}

// ToolCallFunction names the tool and carries its arguments.
type ToolCallFunction struct {
	Index     int                       `json:"index"`
	Name      string                    `json:"name"`
	Arguments ToolCallFunctionArguments `json:"arguments"`
}

// ToolCallFunctionArguments holds tool-call arguments in the order the model
// emitted them.
type ToolCallFunctionArguments struct {
	om *orderedMap[any]
}

// MarshalJSON has a value receiver so that the by-value Arguments field
// encodes through it. The zero value encodes as an empty object, never null.
func (t ToolCallFunctionArguments) MarshalJSON() ([]byte, error) {
	if t.om == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(t.om)
}

func (t *ToolCallFunctionArguments) UnmarshalJSON(data []byte) error {
	t.om = newOrderedMap[any]()
	return json.Unmarshal(data, t.om)
}

// String renders the arguments as the JSON object string that callers pass on
// as a tool-call argument payload. The zero value renders as "{}".
func (t *ToolCallFunctionArguments) String() string {
	if t == nil || t.om == nil {
		return "{}"
	}
	bts, _ := json.Marshal(t.om)
	return string(bts)
}

// Tools is the tool list attached to a chat request.
type Tools []Tool

// Tool is one tool offered to the model.
type Tool struct {
	Type     string       `json:"type"`
	Items    any          `json:"items,omitempty"`
	Function ToolFunction `json:"function"`
}

// ToolFunction describes a callable tool.
type ToolFunction struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Parameters  ToolFunctionParameters `json:"parameters"`
}

// ToolFunctionParameters is the JSON Schema object describing a tool's
// arguments.
type ToolFunctionParameters struct {
	Type       string             `json:"type"`
	Defs       any                `json:"$defs,omitempty"`
	Items      any                `json:"items,omitempty"`
	Required   []string           `json:"required,omitempty"`
	Properties *ToolPropertiesMap `json:"properties"`
}

// ToolPropertiesMap holds schema properties in declaration order.
type ToolPropertiesMap struct {
	om *orderedMap[ToolProperty]
}

// MarshalJSON has a value receiver to match the upstream method set. The zero
// value encodes as null.
func (t ToolPropertiesMap) MarshalJSON() ([]byte, error) {
	if t.om == nil {
		return []byte("null"), nil
	}
	return json.Marshal(t.om)
}

func (t *ToolPropertiesMap) UnmarshalJSON(data []byte) error {
	t.om = newOrderedMap[ToolProperty]()
	return json.Unmarshal(data, t.om)
}

// ToolProperty is one JSON Schema property of a tool's parameters.
type ToolProperty struct {
	AnyOf       []ToolProperty     `json:"anyOf,omitempty"`
	Type        PropertyType       `json:"type,omitempty"`
	Items       any                `json:"items,omitempty"`
	Description string             `json:"description,omitempty"`
	Enum        []any              `json:"enum,omitempty"`
	Properties  *ToolPropertiesMap `json:"properties,omitempty"`
	Required    []string           `json:"required,omitempty"`
}

// PropertyType is a JSON Schema type that is a bare string when single-valued
// and an array otherwise.
type PropertyType []string

// MarshalJSON collapses a single type to a string, matching how schemas are
// conventionally written.
func (pt PropertyType) MarshalJSON() ([]byte, error) {
	if len(pt) == 1 {
		return json.Marshal(pt[0])
	}
	return json.Marshal([]string(pt))
}

// UnmarshalJSON accepts either a string or an array of strings.
func (pt *PropertyType) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		*pt = []string{s}
		return nil
	}

	var a []string
	if err := json.Unmarshal(data, &a); err != nil {
		return err
	}
	*pt = a
	return nil
}

// GenerateRequest is the body of POST /api/generate.
type GenerateRequest struct {
	Model string `json:"model"`
	// Runner selects one child manifest of a manifest-list model; empty selects
	// the manifest the server marks as selected.
	Runner   string          `json:"runner,omitempty"`
	Prompt   string          `json:"prompt"`
	Suffix   string          `json:"suffix"`
	System   string          `json:"system"`
	Template string          `json:"template"`
	Context  []int           `json:"context,omitempty"`
	Stream   *bool           `json:"stream,omitempty"`
	Raw      bool            `json:"raw,omitempty"`
	Format   json.RawMessage `json:"format,omitempty"`
	// KeepAlive is the model residency window. Omitting it resets residency to
	// the server default, so every request must set it.
	KeepAlive       *Duration      `json:"keep_alive,omitempty"`
	Images          []ImageData    `json:"images,omitempty"`
	Options         map[string]any `json:"options"`
	Think           *ThinkValue    `json:"think,omitempty"`
	Truncate        *bool          `json:"truncate,omitempty"`
	Shift           *bool          `json:"shift,omitempty"`
	DebugRenderOnly bool           `json:"_debug_render_only,omitempty"`
	Logprobs        bool           `json:"logprobs,omitempty"`
	TopLogprobs     int            `json:"top_logprobs,omitempty"`
	// Width, Height and Steps are image-generation controls the vendor's
	// GenerateRequest does not define; they belong to an extension endpoint and
	// are absent from a request that does not ask for an image.
	Width  int32 `json:"width,omitempty"`
	Height int32 `json:"height,omitempty"`
	Steps  int32 `json:"steps,omitempty"`
}

// ChatRequest is the body of POST /api/chat.
type ChatRequest struct {
	Model string `json:"model"`
	// Runner selects one child manifest of a manifest-list model; empty selects
	// the manifest the server marks as selected.
	Runner    string          `json:"runner,omitempty"`
	Messages  []Message       `json:"messages"`
	Stream    *bool           `json:"stream,omitempty"`
	Format    json.RawMessage `json:"format,omitempty"`
	KeepAlive *Duration       `json:"keep_alive,omitempty"`
	// Tools is embedded, as upstream: the tag makes it the "tools" key rather
	// than an inlined struct.
	Tools           `json:"tools,omitempty"`
	Options         map[string]any `json:"options"`
	Think           *ThinkValue    `json:"think,omitempty"`
	Truncate        *bool          `json:"truncate,omitempty"`
	Shift           *bool          `json:"shift,omitempty"`
	DebugRenderOnly bool           `json:"_debug_render_only,omitempty"`
	Logprobs        bool           `json:"logprobs,omitempty"`
	TopLogprobs     int            `json:"top_logprobs,omitempty"`
	// Session names the conversation this turn belongs to, on the `session`
	// extension. It is sent only to an endpoint that declared it: upstream
	// Ollama has never seen the field, and a body it cannot parse is a turn it
	// refuses.
	Session string `json:"contenox_session,omitempty"`
}

// Metrics are the timing and token counters every completion response carries
// inline. PromptEvalCachedCount is the number of prompt tokens served from the
// cache; it is a pointer because an absent count and a count of zero are
// different reports. PeakMemory is an extension counter the vendor's Metrics
// does not define.
type Metrics struct {
	TotalDuration         time.Duration `json:"total_duration,omitempty"`
	PeakMemory            uint64        `json:"peak_memory,omitempty"`
	LoadDuration          time.Duration `json:"load_duration,omitempty"`
	PromptEvalCount       int           `json:"prompt_eval_count,omitempty"`
	PromptEvalCachedCount *int          `json:"prompt_eval_cached_count,omitempty"`
	PromptEvalDuration    time.Duration `json:"prompt_eval_duration,omitempty"`
	EvalCount             int           `json:"eval_count,omitempty"`
	EvalDuration          time.Duration `json:"eval_duration,omitempty"`
}

// Usage converts the counters into the neutral accounting. The prompt count
// already includes cached tokens, so the cached count is reported beside it
// rather than subtracted from it.
func (m Metrics) Usage() *modelrepo.TokenUsage {
	usage := &modelrepo.TokenUsage{
		PromptTokens:     m.PromptEvalCount,
		CompletionTokens: m.EvalCount,
		TotalTokens:      m.PromptEvalCount + m.EvalCount,
	}
	if m.PromptEvalCachedCount != nil {
		usage.CacheReadTokens = *m.PromptEvalCachedCount
	}
	return usage
}

// DebugInfo is returned only for debug-render requests.
type DebugInfo struct {
	RenderedTemplate string `json:"rendered_template"`
	ImageCount       int    `json:"image_count,omitempty"`
}

// TokenLogprob is the log probability of one token alternative.
type TokenLogprob struct {
	Token   string  `json:"token"`
	Logprob float64 `json:"logprob"`
	Bytes   []int   `json:"bytes,omitempty"`
}

// Logprob is the log probability of a generated token plus its alternatives.
type Logprob struct {
	TokenLogprob
	TopLogprobs []TokenLogprob `json:"top_logprobs,omitempty"`
}

// ChatResponse is one frame of POST /api/chat. Metrics is embedded untagged,
// so its fields are inlined on the wire.
type ChatResponse struct {
	Model       string     `json:"model"`
	RemoteModel string     `json:"remote_model,omitempty"`
	RemoteHost  string     `json:"remote_host,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	Message     Message    `json:"message"`
	Done        bool       `json:"done"`
	DoneReason  string     `json:"done_reason,omitempty"`
	DebugInfo   *DebugInfo `json:"_debug_info,omitempty"`
	Logprobs    []Logprob  `json:"logprobs,omitempty"`

	Metrics
}

// GenerateResponse is one frame of POST /api/generate. Metrics is embedded
// untagged, so its fields are inlined on the wire.
type GenerateResponse struct {
	Model       string    `json:"model"`
	RemoteModel string    `json:"remote_model,omitempty"`
	RemoteHost  string    `json:"remote_host,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	Response    string    `json:"response"`
	Thinking    string    `json:"thinking,omitempty"`
	Done        bool      `json:"done"`
	DoneReason  string    `json:"done_reason,omitempty"`
	Context     []int     `json:"context,omitempty"`

	Metrics

	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
	DebugInfo *DebugInfo `json:"_debug_info,omitempty"`
	Logprobs  []Logprob  `json:"logprobs,omitempty"`
	Image     string     `json:"image,omitempty"`
	Completed int64      `json:"completed,omitempty"`
	Total     int64      `json:"total,omitempty"`
}

// EmbedRequest is the body of POST /api/embed.
type EmbedRequest struct {
	Model      string         `json:"model"`
	Input      any            `json:"input"`
	KeepAlive  *Duration      `json:"keep_alive,omitempty"`
	Truncate   *bool          `json:"truncate,omitempty"`
	Dimensions int            `json:"dimensions,omitempty"`
	Options    map[string]any `json:"options"`
}

// EmbedResponse is the response to POST /api/embed.
type EmbedResponse struct {
	Model      string      `json:"model"`
	Embeddings [][]float32 `json:"embeddings"`

	TotalDuration   time.Duration `json:"total_duration,omitempty"`
	LoadDuration    time.Duration `json:"load_duration,omitempty"`
	PromptEvalCount int           `json:"prompt_eval_count,omitempty"`
}

// DeleteRequest is the body of DELETE /api/delete.
type DeleteRequest struct {
	Model string `json:"model"`

	// Deprecated: set the model name with Model instead.
	Name string `json:"name"`
}

// ShowRequest is the body of POST /api/show.
type ShowRequest struct {
	Model string `json:"model"`
	// Runner selects one child manifest of a manifest-list model; empty selects
	// the manifest the server marks as selected.
	Runner string `json:"runner,omitempty"`
	// AllManifests asks for every child manifest of a manifest-list model.
	AllManifests bool   `json:"all_manifests,omitempty"`
	System       string `json:"system"`

	// Deprecated: Template is ignored by current servers.
	Template string `json:"template"`
	Verbose  bool   `json:"verbose"`

	Options map[string]any `json:"options"`

	// Deprecated: set the model name with Model instead.
	Name string `json:"name"`
}

// ShowResponse is the response to POST /api/show.
type ShowResponse struct {
	License       string            `json:"license,omitempty"`
	Modelfile     string            `json:"modelfile,omitempty"`
	Parameters    string            `json:"parameters,omitempty"`
	Template      string            `json:"template,omitempty"`
	System        string            `json:"system,omitempty"`
	Renderer      string            `json:"renderer,omitempty"`
	Parser        string            `json:"parser,omitempty"`
	Details       ModelDetails      `json:"details,omitempty"`
	Messages      []Message         `json:"messages,omitempty"`
	RemoteModel   string            `json:"remote_model,omitempty"`
	RemoteHost    string            `json:"remote_host,omitempty"`
	ModelInfo     map[string]any    `json:"model_info"`
	ProjectorInfo map[string]any    `json:"projector_info,omitempty"`
	Tensors       []Tensor          `json:"tensors,omitempty"`
	Capabilities  []Capability      `json:"capabilities,omitempty"`
	Thinking      *ThinkingMetadata `json:"thinking,omitempty"`
	Manifests     []ManifestSummary `json:"manifests,omitempty"`
	// NextEditFormat and CanNextEdit are the edit-prediction declaration of an
	// extension endpoint; the vendor's ShowResponse does not define them, so a
	// server that does not publish them leaves the model's edit profile unset.
	NextEditFormat string    `json:"next_edit_format,omitempty"`
	CanNextEdit    bool      `json:"next_edit,omitempty"`
	ModifiedAt     time.Time `json:"modified_at,omitempty"`
	Requires       string    `json:"requires,omitempty"`
}

// ManifestSummary describes one child manifest a model tag resolves to, which
// is how a manifest list carries several runner variants under one name.
type ManifestSummary struct {
	Digest   string `json:"digest,omitempty"`
	Runner   string `json:"runner,omitempty"`
	Format   string `json:"format,omitempty"`
	Selected bool   `json:"selected,omitempty"`
}

// SupportsInsert reports that the model's own capability list declares the
// vendor's fill-in-the-middle operation, for which the server renders the
// request from the prompt and its suffix.
func (r *ShowResponse) SupportsInsert() bool {
	if r == nil {
		return false
	}
	return slices.Contains(r.Capabilities, CapabilityInsert)
}

// Tensor is one tensor's metadata in a verbose ShowResponse.
type Tensor struct {
	Name  string   `json:"name"`
	Type  string   `json:"type"`
	Shape []uint64 `json:"shape"`
}

// ListResponse is the response to GET /api/tags.
type ListResponse struct {
	Models []ListModelResponse `json:"models"`
}

// ListModelResponse is one model in a ListResponse.
type ListModelResponse struct {
	Name        string       `json:"name"`
	Model       string       `json:"model"`
	RemoteModel string       `json:"remote_model,omitempty"`
	RemoteHost  string       `json:"remote_host,omitempty"`
	ModifiedAt  time.Time    `json:"modified_at"`
	Size        int64        `json:"size"`
	Digest      string       `json:"digest"`
	Details     ModelDetails `json:"details,omitempty"`
}

// ModelDetails describes a model's format and provenance. A manifest-list model
// reports one row per child manifest, distinguished by Runner.
type ModelDetails struct {
	ParentModel       string   `json:"parent_model"`
	Format            string   `json:"format"`
	Family            string   `json:"family"`
	Families          []string `json:"families"`
	ParameterSize     string   `json:"parameter_size"`
	QuantizationLevel string   `json:"quantization_level"`
	ContextLength     int      `json:"context_length,omitempty"`
	EmbeddingLength   int      `json:"embedding_length,omitempty"`
	Runner            string   `json:"runner,omitempty"`
}
