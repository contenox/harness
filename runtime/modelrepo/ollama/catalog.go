package ollama

import (
	"context"
	"fmt"
	"github.com/contenox/harness/runtime/runtimetypes"
	"net/http"
	"strconv"
	"strings"

	"github.com/contenox/harness/libtracker"
	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/reasoning"
)

const displayNameMetaKey = modelrepo.ObservedDisplayNameMetaKey

type catalogProvider struct {
	spec       modelrepo.BackendSpec
	httpClient *http.Client
	tracker    libtracker.ActivityTracker
}

func init() {
	modelrepo.RegisterCatalogProvider("ollama", func(spec modelrepo.BackendSpec, opts modelrepo.CatalogOptions) (modelrepo.CatalogProvider, error) {
		return newCatalogProvider(spec, opts), nil
	})
}

func newCatalogProvider(spec modelrepo.BackendSpec, opts modelrepo.CatalogOptions) modelrepo.CatalogProvider {
	return &catalogProvider{
		spec:       spec,
		httpClient: opts.HTTPClient,
		tracker:    opts.Tracker,
	}
}

func (p *catalogProvider) Type() string {
	return "ollama"
}

func (p *catalogProvider) ListModels(ctx context.Context) ([]modelrepo.ObservedModel, error) {
	// Catalog listing is a non-streaming call: bound it end-to-end.
	ctx, cancel := modelrepo.NonStreamingContext(ctx)
	defer cancel()

	client, err := newOllamaHTTPClient(p.spec.BaseURL, p.spec.APIKey, p.httpClient)
	if err != nil {
		return nil, err
	}

	speaksExtensions, speaksSession := false, false
	if endpoint, err := client.Contenox(ctx); err == nil && endpoint.IsContenoxGateway() {
		speaksExtensions = endpoint.Supports(ExtensionAudios)
		speaksSession = endpoint.Supports(ExtensionSession)
	}

	resp, err := client.List(ctx)
	if err != nil {
		return nil, err
	}

	// One tag can resolve to several child manifests, one row each; the tag
	// still names one model, and the server's own manifest list says which.
	order := make([]string, 0, len(resp.Models))
	grouped := make(map[string][]ListModelResponse, len(resp.Models))
	for _, model := range resp.Models {
		if _, ok := grouped[model.Model]; !ok {
			order = append(order, model.Model)
		}
		grouped[model.Model] = append(grouped[model.Model], model)
	}

	out := make([]modelrepo.ObservedModel, 0, len(order))
	for _, name := range order {
		rows := grouped[name]
		observed := modelrepo.ObservedModel{
			Name:       rows[0].Model,
			ModifiedAt: rows[0].ModifiedAt,
			Size:       rows[0].Size,
			Digest:     rows[0].Digest,
			Meta: map[string]string{
				displayNameMetaKey: rows[0].Name,
			},
		}

		observed.CapabilityConfig.AudioExtension = speaksExtensions
		observed.CapabilityConfig.SessionExtension = speaksSession

		showResp, err := client.Show(ctx, &ShowRequest{Model: name})
		if err != nil {
			return nil, fmt.Errorf("ollama model details unavailable for %s: %w", name, err)
		}
		if len(rows) > 1 {
			if err := checkManifestSelection(ctx, client, name, rows); err != nil {
				return nil, err
			}
		}
		applyShowMetadata(&observed, showResp, speaksExtensions)
		observed.NextEditFormat = showResp.NextEditFormat
		observed.CanNextEdit = showResp.CanNextEdit && showResp.NextEditFormat != ""

		out = append(out, observed)
	}

	return out, nil
}

// checkManifestSelection refuses a tag whose rows cannot be reduced to the one
// manifest the server says the tag resolves to; reporting every variant under
// one name would leave the name ambiguous for every consumer downstream.
func checkManifestSelection(ctx context.Context, client *ollamaHTTPClient, name string, rows []ListModelResponse) error {
	show, err := client.Show(ctx, &ShowRequest{Model: name, AllManifests: true})
	if err != nil {
		return fmt.Errorf("ollama manifest list unavailable for %s: %w", name, err)
	}
	for _, manifest := range show.Manifests {
		if !manifest.Selected {
			continue
		}
		selected := 0
		for _, row := range rows {
			if row.Details.Runner == manifest.Runner {
				selected++
			}
		}
		if selected != 1 {
			return fmt.Errorf("ollama model %s lists %d rows and its selected manifest %q matches %d of them", name, len(rows), manifest.Runner, selected)
		}
		return nil
	}
	return fmt.Errorf("ollama model %s lists %d manifests and its manifest list marks none selected", name, len(rows))
}
func (p *catalogProvider) ProviderFor(model modelrepo.ObservedModel) modelrepo.Provider {
	return NewOllamaProvider(
		model.Name,
		[]string{p.spec.BaseURL},
		p.httpClient,
		model.CapabilityConfig,
		p.spec.APIKey,
		p.tracker,
	)
}

func applyShowMetadata(model *modelrepo.ObservedModel, resp *ShowResponse, audioExtension bool) {
	for _, cap := range resp.Capabilities {
		switch cap {
		case CapabilityCompletion:
			model.CanChat = true
			model.CanPrompt = true
			model.CanStream = true
		case CapabilityEmbedding:
			model.CanEmbed = true
		case CapabilityTools:
			model.CanChat = true
		case CapabilityVision:
			model.CanVision = true
		case CapabilityThinking:
			model.CanThink = true
		case CapabilityAudio:
			model.CanAudio = audioExtension
		}
	}
	if resp.SupportsInsert() {
		model.CanAutocomplete = true
		model.CompletionMode = runtimetypes.CompletionModeFIM
		model.FIMFormat = OllamaInsertFIMFormat
	}

	model.ThinkingTypes = ollamaThinkingTypes(resp.Thinking)

	// Both fields carry the window and both are read: the ObservedModel one by
	// the runtime state, the CapabilityConfig one by every provider built from
	// this observation. Setting only the first left a provider reporting an
	// unknown window for a model the catalogue had just measured.
	if model.ContextLength == 0 {
		for key, value := range resp.ModelInfo {
			if !strings.HasSuffix(key, ".context_length") {
				continue
			}
			if n, ok := value.(float64); ok {
				model.ContextLength = int(n)
				model.CapabilityConfig.ContextLength = int(n)
			}
			break
		}
	}

	if model.MaxOutputTokens == 0 {
		model.MaxOutputTokens = parameterInt(resp.Parameters, "num_predict")
	}
}

// ollamaThinkingTypes reads the model's own thinking descriptor into the
// runtime's declaration. A descriptor that names only levels this vocabulary
// does not carry leaves the level list empty, so a caller asking for one is
// refused rather than sent a name the server would resolve to its default.
func ollamaThinkingTypes(descriptor *ThinkingMetadata) *modelrepo.ThinkingTypes {
	if descriptor == nil || len(descriptor.Values) == 0 {
		return nil
	}
	types := &modelrepo.ThinkingTypes{}
	for _, value := range descriptor.Values {
		switch v := value.(type) {
		case bool:
			if v {
				types.Enabled = true
			} else {
				types.Disabled = true
			}
		case string:
			switch v {
			case reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh, reasoning.Max:
				types.EffortLevels = append(types.EffortLevels, v)
			}
		}
	}
	return types
}

// parameterInt reads one parameter out of the Modelfile-style parameters string
// /api/show reports, whose lines are "<name> <value>" — "num_predict 8192",
// "num_ctx 4096". A parameter that is absent, not a number, or not positive is
// unknown rather than a ceiling of zero.
func parameterInt(parameters, name string) int {
	for _, line := range strings.Split(parameters, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 || fields[0] != name {
			continue
		}
		if n, err := strconv.Atoi(fields[1]); err == nil && n > 0 {
			return n
		}
	}
	return 0
}
