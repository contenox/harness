package vllm

import (
	"context"
	"fmt"

	"github.com/contenox/harness/runtime/modelcontract"
	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/modelrepo/codec/completions"
	"github.com/contenox/harness/runtime/modelrepo/codec/nextedit"
)

type nextEditClient struct {
	vLLMClient
	format string
}

// CanNextEdit reports the model's explicit independent edit capability.
func (p *vLLMProvider) CanNextEdit() bool {
	if !p.SupportsNextEdit {
		return false
	}
	_, err := modelcontract.ResolveNextEdit(p.NextEditFormat)
	return err == nil
}

// GetNextEditConnection binds the model's declared edit profile to vLLM completion.
func (p *vLLMProvider) GetNextEditConnection(_ context.Context, backend string) (modelrepo.LLMNextEditClient, error) {
	if !p.CanNextEdit() {
		return nil, modelrepo.ErrNextEditUnsupported
	}
	if err := p.validateBackend(backend); err != nil {
		return nil, err
	}
	client := p.client
	if client == nil {
		client = modelrepo.SharedHTTPClient
	}
	return &nextEditClient{vLLMClient: vLLMClient{baseURL: backend, httpClient: client, modelName: p.Name, maxOutputTokens: p.MaxOutputTokens, apiKey: p.authToken, tracker: p.tracker}, format: p.NextEditFormat}, nil
}

// NextEdit executes the profile's raw completion prompt and validates its replacements.
func (c *nextEditClient) NextEdit(ctx context.Context, input modelrepo.NextEditRequest) (modelrepo.NextEditResult, error) {
	if err := input.Validate(); err != nil {
		return modelrepo.NextEditResult{}, err
	}
	if c.maxOutputTokens > 0 && input.MaxTokens > c.maxOutputTokens {
		return modelrepo.NextEditResult{}, fmt.Errorf("next edit output limit exceeds the model's declared maximum of %d tokens", c.maxOutputTokens)
	}
	if err := nextedit.ValidateLimit(c.format, input.MaxTokens); err != nil {
		return modelrepo.NextEditResult{}, err
	}
	prepared, err := nextedit.Prepare(c.format, input.Input)
	if err != nil {
		return modelrepo.NextEditResult{}, err
	}
	request := completions.Request{Model: c.modelName, Prompt: prepared.Render(), MaxTokens: input.MaxTokens, Temperature: input.Temperature, TopP: input.TopP, Seed: input.Seed, Stop: prepared.EndpointStops()}
	var response completions.Response
	if err := c.sendRequest(ctx, "/v1/completions", request, &response); err != nil {
		return modelrepo.NextEditResult{}, err
	}
	completion, err := response.Result()
	if err != nil {
		return modelrepo.NextEditResult{}, err
	}
	edits, err := prepared.Parse(completion.Text, completion.FinishReason)
	if err != nil {
		return modelrepo.NextEditResult{}, err
	}
	return modelrepo.NextEditResult{Edits: edits, FinishReason: completion.FinishReason, Usage: completion.Usage}, nil
}
