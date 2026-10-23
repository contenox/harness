package llmresolver

import (
	"github.com/contenox/harness/libtracker"
)

type Request struct {
	ProviderTypes []string
	ModelNames    []string
	ContextLength int
	// FitContextToModel marks ContextLength as a preference to fit to a capable
	// model's own window instead of refusing a shortfall.
	FitContextToModel bool
	// RequiresVision restricts chat/stream resolution to vision-capable providers.
	RequiresVision bool
	// RequiresAudio restricts chat/stream resolution to audio-capable providers.
	RequiresAudio bool
	Tracker       libtracker.ActivityTracker
}

type EmbedRequest struct {
	ModelName    string
	ProviderType string
	Tracker      libtracker.ActivityTracker
}
