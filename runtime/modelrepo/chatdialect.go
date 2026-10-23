package modelrepo

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/contenox/harness/runtime/reasoning"
)

// ErrUnknownChatDialect reports a backend that names a wire dialect no package
// registered, which is a build-time wiring mistake rather than a vendor answer.
var ErrUnknownChatDialect = errors.New("unknown chat dialect")

// UnsupportedDialectLevelError reports a thinking level the vendor's published
// vocabulary does not carry. Sending it anyway is a request the vendor rejects,
// so the dialect refuses it before the wire and names the level it refused.
type UnsupportedDialectLevelError struct {
	Dialect string
	Level   string
}

// Error names the dialect and the level it will not send.
func (e *UnsupportedDialectLevelError) Error() string {
	return fmt.Sprintf("chat dialect %s has no published thinking level %q", e.Dialect, e.Level)
}

// WireMessage is a chat message in its JSON wire form, so a dialect that spells
// one member differently can restate it without a second request builder.
type WireMessage map[string]any

// ChatDialect is the vendor's own spelling of the OpenAI-compatible chat wire
// format. It exists because "OpenAI-compatible" covers the request and response
// shape, not every member name: two vendors that share the shape still disagree
// about what they call the seed, whether the output ceiling is max_tokens, and
// how a reasoning model's own words come back.
//
// Every member a dialect names comes from that vendor's published request
// reference. A dialect never guesses from a model name and never adds a member
// the vendor does not document.
type ChatDialect interface {
	// Name is the dialect's registry key, which a capability declaration names.
	Name() string
	// DocURL is the vendor page that is the authority for every member this
	// dialect names.
	DocURL() string
	// RewriteBody restates a request body in the vendor's own spelling: it
	// renames the members the vendor names differently and drops the ones the
	// vendor does not declare. It never invents a member and never changes the
	// conversation the request carries.
	RewriteBody(body map[string]any, req DialectRequest) error
	// OwnsReasoning reports that the vendor's reasoning controls share no
	// vocabulary with the shared reasoning_effort mapping, so the dialect
	// restates the level itself and the shared marker must not go on the wire.
	OwnsReasoning() bool
	// ThinkingMember is the assistant-message member this dialect reads a
	// model's reasoning trace back from on the next turn, empty when the vendor's
	// request reference documents no such member and replaying it would be
	// invention.
	ThinkingMember(req DialectRequest) string
	// WireAssistantMessage restates one assistant turn's content and reasoning
	// trace in the dialect's own shape, which is not always a string content
	// beside a sibling member.
	WireAssistantMessage(content, thinking string) (WireMessage, error)
}

// DialectRequest is what a dialect sees of the neutral request when it restates
// the body: the members the shared builder already serialised, plus the level
// the caller asked for, which the shared builder may have declined to send.
type DialectRequest struct {
	// Think is the caller's requested thinking level, nil when unset; it is the
	// runtime's own level, not the wire's, so a dialect maps it itself.
	Think *string
	// Tools reports whether the request carries a tool list.
	Tools bool
	// CacheHints is the request's declared cache affinity, nil when the caller
	// declared none; a dialect that documents its own affinity member reads it
	// here rather than from the shared prompt_cache_key member.
	CacheHints *CacheHints
	// Thinking is what the model's own declaration says about its thinking
	// controls, nil when the endpoint declared none; a dialect whose vendor
	// publishes per-model effort values reads them here instead of sending a
	// level the vendor's reference does not carry for that model.
	Thinking *ThinkingTypes
}

// ThinkLevel is the caller's requested level with the runtime's aliases
// resolved, empty when unset or auto. A level outside the runtime's vocabulary
// is an error the dialect returns, never a setting silently dropped before the
// wire.
func (r DialectRequest) ThinkLevel() (string, error) {
	if r.Think == nil {
		return "", nil
	}
	level, ok, err := reasoning.NormalizeOptional(*r.Think)
	if err != nil {
		return "", err
	}
	if !ok || level == reasoning.Auto {
		return "", nil
	}
	return level, nil
}

// AllowsEffort reports whether the model's own declaration carries the wire
// literal an effort maps to. A model that declared no levels conveys nothing
// about them, so the dialect falls back to the values its vendor documents.
func (r DialectRequest) AllowsEffort(wire string) bool {
	if r.Thinking == nil || len(r.Thinking.EffortLevels) == 0 {
		return true
	}
	return r.Thinking.SupportsEffort(wire)
}

var (
	chatDialectMu       sync.RWMutex
	chatDialectRegistry = map[string]ChatDialect{}
)

// RegisterChatDialect registers a vendor's wire dialect under the name a
// capability declaration carries. Vendor packages call this from init() to keep
// the registry free of import cycles.
func RegisterChatDialect(dialect ChatDialect) {
	if dialect == nil {
		panic("modelrepo: chat dialect cannot be nil")
	}
	name := strings.ToLower(strings.TrimSpace(dialect.Name()))
	if name == "" {
		panic("modelrepo: chat dialect name cannot be empty")
	}
	chatDialectMu.Lock()
	defer chatDialectMu.Unlock()
	if _, exists := chatDialectRegistry[name]; exists {
		panic("modelrepo: chat dialect already registered for " + name)
	}
	chatDialectRegistry[name] = dialect
}

// ChatDialectFor returns the registered dialect named by a capability
// declaration; an empty name selects the OpenAI-compatible defaults the shared
// builder already emits.
func ChatDialectFor(name string) (ChatDialect, error) {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if normalized == "" {
		return nil, nil
	}
	chatDialectMu.RLock()
	defer chatDialectMu.RUnlock()
	dialect, ok := chatDialectRegistry[normalized]
	if !ok {
		return nil, fmt.Errorf("%w %q (registered: %s)", ErrUnknownChatDialect, name, strings.Join(ChatDialectNames(), ", "))
	}
	return dialect, nil
}

// MustChatDialectFor returns the registered dialect named by a capability
// declaration, or nil for the OpenAI-compatible defaults. A name no package
// registered is a wiring mistake the provider cannot serve, so the constructor
// refuses rather than sending the OpenAI spelling to a vendor that rejects it.
func MustChatDialectFor(name string) ChatDialect {
	dialect, err := ChatDialectFor(name)
	if err != nil {
		panic(err)
	}
	return dialect
}

// ChatDialectNames lists the registered dialect names in sorted order.
func ChatDialectNames() []string {
	chatDialectMu.RLock()
	defer chatDialectMu.RUnlock()
	names := make([]string, 0, len(chatDialectRegistry))
	for name := range chatDialectRegistry {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// RewriteChatBody restates an already-serialised request body in the dialect's
// own spelling; a nil dialect returns the body unchanged.
func RewriteChatBody(dialect ChatDialect, body []byte, req DialectRequest) ([]byte, error) {
	if dialect == nil {
		return body, nil
	}
	var members map[string]any
	if err := json.Unmarshal(body, &members); err != nil {
		return nil, fmt.Errorf("chat dialect %s: decode request body: %w", dialect.Name(), err)
	}
	if err := dialect.RewriteBody(members, req); err != nil {
		return nil, fmt.Errorf("chat dialect %s: %w", dialect.Name(), err)
	}
	rewritten, err := json.Marshal(members)
	if err != nil {
		return nil, fmt.Errorf("chat dialect %s: encode request body: %w", dialect.Name(), err)
	}
	return rewritten, nil
}
