package modelrepo

import (
	"context"
	"errors"
	"math"

	"github.com/contenox/harness/runtime/modelcontract"
)

// ErrNextEditUnsupported means the selected model cannot execute independent edit prediction.
var ErrNextEditUnsupported = errors.New("independent next edit prediction is unavailable for the selected model")

// NextEditRequest carries a document edit prediction and generation settings.
type NextEditRequest struct {
	Input       modelcontract.NextEditInput
	MaxTokens   int
	Temperature float64
	TopP        float64
	Seed        int
	SessionKey  string
}

// Validate rejects incomplete sampling settings and session identity.
func (r NextEditRequest) Validate() error {
	if err := r.Input.Validate(); err != nil {
		return err
	}
	if r.MaxTokens <= 0 || math.IsNaN(r.Temperature) || math.IsInf(r.Temperature, 0) || r.Temperature < 0 || math.IsNaN(r.TopP) || math.IsInf(r.TopP, 0) || r.TopP <= 0 || r.TopP > 1 || r.Seed < 0 || r.SessionKey == "" {
		return errors.New("next edit requires a positive token limit, valid sampling settings and session identity")
	}
	return nil
}

// NextEditResult carries exact source replacements and provider accounting.
type NextEditResult struct {
	Edits        []modelcontract.TextEdit
	FinishReason string
	Usage        *TokenUsage
}

// LLMNextEditClient executes an independent next edit prediction.
type LLMNextEditClient interface {
	// NextEdit predicts independent source replacements for one document.
	NextEdit(context.Context, NextEditRequest) (NextEditResult, error)
}
