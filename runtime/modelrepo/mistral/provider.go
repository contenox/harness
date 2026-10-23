package mistral

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/contenox/harness/libtracker"
	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/modelrepo/openai"
)

type provider struct {
	modelrepo.Provider
	apiKey               string
	baseURL              string
	client               *http.Client
	model                string
	tracker              libtracker.ActivityTracker
	canAutocomplete      bool
	declaredAutocomplete bool
	fimFormat            string
}

func newProvider(apiKey, model, baseURL string, caps modelrepo.CapabilityConfig, client *http.Client, tracker libtracker.ActivityTracker) *provider {
	if client == nil {
		client = modelrepo.SharedHTTPClient
	}
	if tracker == nil {
		tracker = libtracker.NoopTracker{}
	}
	declaredAutocomplete := caps.CanAutocomplete
	canAutocomplete := declaredAutocomplete && caps.FIMFormat == "mistral-fim"
	caps.CanAutocomplete = false
	// Every model this backend serves is reached through Mistral's own request
	// reference, so the dialect is a property of the vendor rather than of a
	// catalogue row: a model declared by hand speaks the same spelling.
	caps.Dialect = dialectName
	return &provider{Provider: openai.NewOpenAIProvider(apiKey, model, []string{baseURL}, caps, client, tracker), apiKey: apiKey, baseURL: baseURL, client: client, model: model, tracker: tracker, canAutocomplete: canAutocomplete, declaredAutocomplete: declaredAutocomplete, fimFormat: caps.FIMFormat}
}

func (p *provider) GetType() string       { return "mistral" }
func (p *provider) CanAutocomplete() bool { return p.canAutocomplete }

// CanNextEdit reports that Mistral's native FIM operation is not a structured edit protocol.
func (p *provider) CanNextEdit() bool { return false }

// GetNextEditConnection refuses to treat Mistral FIM as an independent edit operation.
func (p *provider) GetNextEditConnection(context.Context, string) (modelrepo.LLMNextEditClient, error) {
	return nil, modelrepo.ErrNextEditUnsupported
}

func (p *provider) GetAutocompleteConnection(ctx context.Context, backendID string) (modelrepo.LLMAutocompleteClient, error) {
	if !p.declaredAutocomplete {
		return nil, modelrepo.ErrAutocompleteUnsupported
	}
	if p.fimFormat != "mistral-fim" {
		return nil, fmt.Errorf("mistral native autocomplete requires the mistral-fim operation contract")
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	baseURL := p.baseURL
	if backendID != "" {
		baseURL = strings.TrimRight(backendID, "/")
	}
	return &autocompleteClient{apiKey: p.apiKey, baseURL: baseURL, client: p.client, model: p.model, tracker: p.tracker}, nil
}

var _ modelrepo.Provider = (*provider)(nil)
