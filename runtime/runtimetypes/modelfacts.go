package runtimetypes

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/contenox/harness/libkeypool"
	"github.com/contenox/harness/runtime/modelcontract"
	"slices"
	"strings"
	"time"

	libdb "github.com/contenox/harness/libdbexec"
)

// The capabilities a model may be declared to have. The values are the Ollama
// /api/show capability names verbatim, because that is the wire a gateway client
// parses: a value outside this set would be stored, reported, and then silently
// ignored by every reader, which is a declaration that cannot take effect.
const (
	CapabilityCompletion   = "completion"
	CapabilityAutocomplete = "autocomplete"
	CapabilityNextEdit     = "next_edit"
	CapabilityTools        = "tools"
	CapabilityVision       = "vision"
	CapabilityThinking     = "thinking"
	CapabilityEmbedding    = "embedding"
	CapabilityAudio        = "audio"
)

// The completion execution contracts a model may be declared under: a native
// fill-in-the-middle token contract, an instructed chat model, or a raw prompt.
const (
	CompletionModeFIM      = "fim"
	CompletionModeInstruct = "instruct"
	CompletionModePrompt   = "prompt"
)

// ModelCapabilities is every capability a declaration may name.
func ModelCapabilities() []string {
	return []string{
		CapabilityCompletion, CapabilityAutocomplete, CapabilityNextEdit, CapabilityTools, CapabilityVision,
		CapabilityThinking, CapabilityEmbedding, CapabilityAudio,
	}
}

// The rotation policies a provider's upstream key pool may declare. The values
// are libkeypool's, which is the one place they are written: a declaration is
// stored, reported and executed, so a second spelling here would be a name the
// pool does not honour.
const (
	KeyRotationStickyClient = string(libkeypool.PolicyStickyClient)
	KeyRotationRoundRobin   = string(libkeypool.PolicyRoundRobin)
)

// KeyRotations is every rotation policy a declaration may name.
func KeyRotations() []string {
	policies := libkeypool.Policies()
	out := make([]string, 0, len(policies))
	for _, policy := range policies {
		out = append(out, string(policy))
	}
	return out
}

// ValidKeyRotation reports whether name is a policy a reader honours. The empty
// string is one of them: it is a pool that declared no policy.
func ValidKeyRotation(name string) bool {
	return libkeypool.ValidPolicy(libkeypool.Policy(name))
}

// ModelPricing is the upstream cost card for one model, in USD per 1M units.
type ModelPricing struct {
	// InputPerMillion is the cost in USD per 1M uncached input (prompt) tokens.
	InputPerMillion float64 `json:"input_per_million,omitempty"`
	// CacheReadPerMillion is the cost in USD per 1M cached prompt tokens.
	CacheReadPerMillion float64 `json:"cache_read_per_million,omitempty"`
	// CacheWritePerMillion is the cost in USD per 1M tokens written to cache.
	CacheWritePerMillion float64 `json:"cache_write_per_million,omitempty"`
	// OutputPerMillion is the cost in USD per 1M completion / thinking tokens.
	OutputPerMillion float64 `json:"output_per_million,omitempty"`
	// PerImage is the cost in USD of one image attachment. It is not per million
	// of anything: a provider that bills images apart from tokens quotes them one
	// at a time, and the count is exact, so there is nothing to amortize.
	PerImage float64 `json:"per_image,omitempty"`
	// PerAudioMebibyte is the cost in USD of one mebibyte of inline audio.
	// Upstream quotes audio by the minute; a mebibyte is the unit this side can
	// measure exactly, and at 128 kbps it is about a minute, which is the
	// conversion an operator states a per-minute rate through.
	PerAudioMebibyte float64 `json:"per_audio_mebibyte,omitempty"`
}

// CalculateCost is the USD cost of one turn under this card. images is the
// number of image attachments the turn carried, which a provider that prices
// images apart from the tokens it reports for them is charged for separately.
func (p ModelPricing) CalculateCost(promptTokens, cacheReadTokens, cacheWriteTokens, completionTokens, images, audioBytes int64) float64 {
	uncachedInput := promptTokens - cacheReadTokens
	if uncachedInput < 0 {
		uncachedInput = 0
	}
	inputCost := (float64(uncachedInput) / 1_000_000.0) * p.InputPerMillion
	cacheReadCost := (float64(cacheReadTokens) / 1_000_000.0) * p.CacheReadPerMillion
	cacheWriteCost := (float64(cacheWriteTokens) / 1_000_000.0) * p.CacheWritePerMillion
	outputCost := (float64(completionTokens) / 1_000_000.0) * p.OutputPerMillion
	imageCost := float64(images) * p.PerImage
	audioCost := (float64(audioBytes) / Mebibyte) * p.PerAudioMebibyte
	return inputCost + cacheReadCost + cacheWriteCost + outputCost + imageCost + audioCost
}

// Mebibyte is what the audio rate is quoted per, and the divisor the meter
// applies to the bytes it counted.
const Mebibyte = 1 << 20

// ModelFacts is what the operator states about one served model that the
// upstream's own model list does not report: its context window, its output
// ceiling, capabilities, and upstream pricing.
type ModelFacts struct {
	// Registered explicitly enables routing without provider catalog discovery.
	Registered bool `json:"registered,omitempty"`
	// CompletionMode names the operator-declared completion execution contract.
	CompletionMode string `json:"completion_mode,omitempty"`
	// FIMFormat is the native fill-in-the-middle token contract.
	FIMFormat string `json:"fim_format,omitempty"`
	// NextEditFormat is the explicitly declared independent edit protocol.
	NextEditFormat string `json:"next_edit_format,omitempty"`
	// AudioExtension explicitly declares the endpoint's inline audio wire extension.
	AudioExtension bool `json:"audio_extension,omitempty"`
	// ContextLength is the model's whole context window in tokens, input and
	// output together.
	ContextLength int `json:"context_length,omitempty"`
	// MaxOutputTokens is the largest completion the upstream accepts.
	MaxOutputTokens int `json:"max_output_tokens,omitempty"`
	// Capabilities replaces what the upstream was observed to report, because an
	// operator who states a model's capabilities is correcting the observation,
	// not adding to it.
	Capabilities []string `json:"capabilities,omitempty"`
	// Pricing is the upstream provider's rate card for this model.
	Pricing *ModelPricing `json:"pricing,omitempty"`
}

// IsZero reports whether the declaration states nothing.
func (f ModelFacts) IsZero() bool {
	return !f.Registered && !f.AudioExtension && f.CompletionMode == "" && f.FIMFormat == "" && f.NextEditFormat == "" && f.ContextLength == 0 && f.MaxOutputTokens == 0 && len(f.Capabilities) == 0 && f.Pricing == nil
}

// ValidateModelFacts refuses a declaration no reader could honour: a negative
// size, a capability outside the vocabulary, or negative pricing rates.
func ValidateModelFacts(facts ModelFacts) error {
	if facts.CompletionMode != "" && facts.CompletionMode != CompletionModeInstruct && facts.CompletionMode != CompletionModePrompt && facts.CompletionMode != CompletionModeFIM {
		return errors.New("completion_mode must be fim, instruct, prompt or empty")
	}
	if facts.CompletionMode == CompletionModeFIM {
		if _, err := modelcontract.ResolveFIM(facts.FIMFormat); err != nil {
			return err
		}
		if !slices.Contains(facts.Capabilities, CapabilityAutocomplete) {
			return errors.New("native FIM requires the autocomplete capability")
		}
	} else if facts.FIMFormat != "" || slices.Contains(facts.Capabilities, CapabilityAutocomplete) {
		return errors.New("the native autocomplete capability requires completion_mode fim and its explicit FIM format")
	}
	if facts.CompletionMode == "prompt" && !slices.Contains(facts.Capabilities, CapabilityCompletion) {
		return errors.New("prompt completion requires the completion capability")
	}
	if facts.NextEditFormat != "" {
		if _, err := modelcontract.ResolveNextEdit(facts.NextEditFormat); err != nil {
			return err
		}
		if !slices.Contains(facts.Capabilities, CapabilityNextEdit) {
			return errors.New("the next_edit capability requires its explicit next_edit_format")
		}
	} else if slices.Contains(facts.Capabilities, CapabilityNextEdit) {
		return errors.New("the next_edit capability requires its explicit next_edit_format")
	}
	if facts.Registered && (facts.ContextLength <= 0 || len(facts.Capabilities) == 0) {
		return errors.New("model registration requires an explicit context length and capabilities")
	}
	if facts.ContextLength < 0 {
		return fmt.Errorf("context_length %d is negative", facts.ContextLength)
	}
	if facts.MaxOutputTokens < 0 {
		return fmt.Errorf("max_output_tokens %d is negative", facts.MaxOutputTokens)
	}
	for _, capability := range facts.Capabilities {
		if !ValidModelCapability(capability) {
			return fmt.Errorf("capability %q is not one of %s",
				capability, strings.Join(ModelCapabilities(), ", "))
		}
	}
	if p := facts.Pricing; p != nil {
		if p.InputPerMillion < 0 || p.CacheReadPerMillion < 0 || p.CacheWritePerMillion < 0 || p.OutputPerMillion < 0 || p.PerImage < 0 || p.PerAudioMebibyte < 0 {
			return errors.New("pricing rates must be non-negative")
		}
	}
	return nil
}

// ValidModelCapability reports whether name is a capability a reader honours.
func ValidModelCapability(name string) bool {
	for _, known := range ModelCapabilities() {
		if name == known {
			return true
		}
	}
	return false
}

// SetLLMProviderModelFacts writes one provider's per-model facts, replacing any
// it had. An empty map clears the declaration, which is how an operator returns
// a provider to what the upstream is observed to report.
func (s *store) SetLLMProviderModelFacts(ctx context.Context, providerID string, facts map[string]ModelFacts) error {
	if providerID == "" {
		return libdb.ErrNotFound
	}
	stored := make(map[string]ModelFacts, len(facts))
	for model, modelFacts := range facts {
		if strings.TrimSpace(model) == "" || modelFacts.IsZero() {
			continue
		}
		if err := ValidateModelFacts(modelFacts); err != nil {
			return fmt.Errorf("store: model %s: %w", model, err)
		}
		stored[model] = modelFacts
	}
	if len(stored) == 0 {
		return s.DeleteLLMProviderModelFacts(ctx, providerID)
	}
	raw, err := json.Marshal(stored)
	if err != nil {
		return fmt.Errorf("store: encode provider model facts: %w", err)
	}
	_, err = s.ExecContext(ctx, `
		INSERT INTO llm_provider_model_facts (provider_id, facts, updated_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (provider_id) DO UPDATE SET
			facts = excluded.facts,
			updated_at = excluded.updated_at
	`, providerID, string(raw), time.Now().UTC())
	if err != nil {
		return fmt.Errorf("store: set provider model facts: %w", err)
	}
	return nil
}

// SetLLMProviderModelFact writes one model's facts for one provider, leaving the
// provider's other models declared. Facts that state nothing remove the entry,
// and a provider left declaring nothing loses its row.
func (s *store) SetLLMProviderModelFact(ctx context.Context, providerID, model string, facts ModelFacts) error {
	model = strings.TrimSpace(model)
	if providerID == "" || model == "" {
		return libdb.ErrNotFound
	}
	if facts.IsZero() {
		return s.DeleteLLMProviderModelFact(ctx, providerID, model)
	}
	if err := ValidateModelFacts(facts); err != nil {
		return fmt.Errorf("store: model %s: %w", model, err)
	}
	declared, err := s.GetLLMProviderModelFacts(ctx, providerID)
	if err != nil {
		return err
	}
	declared[model] = facts
	return s.SetLLMProviderModelFacts(ctx, providerID, declared)
}

// DeleteLLMProviderModelFact removes one model's facts from one provider.
func (s *store) DeleteLLMProviderModelFact(ctx context.Context, providerID, model string) error {
	model = strings.TrimSpace(model)
	if providerID == "" || model == "" {
		return libdb.ErrNotFound
	}
	declared, err := s.GetLLMProviderModelFacts(ctx, providerID)
	if err != nil {
		return err
	}
	if _, ok := declared[model]; !ok {
		return nil
	}
	delete(declared, model)
	return s.SetLLMProviderModelFacts(ctx, providerID, declared)
}

// DeleteLLMProviderModelFacts clears a provider's per-model facts.
func (s *store) DeleteLLMProviderModelFacts(ctx context.Context, providerID string) error {
	if providerID == "" {
		return libdb.ErrNotFound
	}
	if _, err := s.ExecContext(ctx, `
		DELETE FROM llm_provider_model_facts WHERE provider_id = $1
	`, providerID); err != nil {
		return fmt.Errorf("store: delete provider model facts: %w", err)
	}
	return nil
}

// GetLLMProviderModelFacts reads one provider's per-model facts. A provider that
// states none returns an empty map, never an invented one.
func (s *store) GetLLMProviderModelFacts(ctx context.Context, providerID string) (map[string]ModelFacts, error) {
	if providerID == "" {
		return nil, libdb.ErrNotFound
	}
	var raw string
	err := s.QueryRowContext(ctx, `
		SELECT facts FROM llm_provider_model_facts WHERE provider_id = $1
	`, providerID).Scan(&raw)
	if err != nil {
		if errors.Is(err, libdb.ErrNotFound) || errors.Is(err, sql.ErrNoRows) {
			return map[string]ModelFacts{}, nil
		}
		return nil, fmt.Errorf("store: get provider model facts: %w", err)
	}
	facts := map[string]ModelFacts{}
	if raw == "" {
		return facts, nil
	}
	if err := json.Unmarshal([]byte(raw), &facts); err != nil {
		return nil, fmt.Errorf("store: decode provider model facts: %w", err)
	}
	return facts, nil
}
