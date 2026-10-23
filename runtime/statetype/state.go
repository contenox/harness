// Package statetype keeps the historical names for the runtime state value
// types. The definitions moved into the runtime-state package; these aliases
// exist so packages written against the old package keep compiling.
package statetype

import (
	"strings"

	"github.com/contenox/harness/runtime/runtimestate"
	"github.com/contenox/harness/runtime/runtimetypes"
	"github.com/ollama/ollama/api"
	ollamamodel "github.com/ollama/ollama/types/model"
)

// BackendRuntimeState is the observed state of one LLM backend.
type BackendRuntimeState = runtimestate.BackendRuntimeState

// ModelPullStatus is what the runtime observed about one pulled model.
type ModelPullStatus = runtimestate.ModelPullStatus

// ModelDetails is the model file's metadata.
type ModelDetails = runtimestate.ModelDetails

// EnrichFromOllamaShow populates capability and context fields on a
// ModelPullStatus using the response from Ollama's /api/show endpoint.
// Only zero/false fields are written — callers may override afterwards.
func EnrichFromOllamaShow(m *ModelPullStatus, r *api.ShowResponse) {
	for _, cap := range r.Capabilities {
		switch cap {
		case ollamamodel.CapabilityCompletion:
			m.CanChat = true
			m.CanPrompt = true
			m.CanStream = true
		case ollamamodel.CapabilityEmbedding:
			m.CanEmbed = true
		case ollamamodel.CapabilityTools:
			m.CanChat = true
		}
	}
	if m.ContextLength == 0 {
		for k, v := range r.ModelInfo {
			if strings.HasSuffix(k, ".context_length") {
				if n, ok := v.(float64); ok {
					m.ContextLength = int(n)
				}
				break
			}
		}
	}
}

// ConvertOllamaModelResponse maps an Ollama list entry onto ModelPullStatus.
func ConvertOllamaModelResponse(model *api.ListModelResponse) *ModelPullStatus {
	list := &ModelPullStatus{
		Name:       model.Name,
		Model:      model.Model,
		ModifiedAt: model.ModifiedAt,
		Size:       model.Size,
		Digest:     model.Digest,
		Details: ModelDetails{
			ParentModel:       model.Details.ParentModel,
			Format:            model.Details.Format,
			Family:            model.Details.Family,
			Families:          model.Details.Families,
			ParameterSize:     model.Details.ParameterSize,
			QuantizationLevel: model.Details.QuantizationLevel,
		},
	}
	return list
}

var _ = runtimetypes.Backend{}
