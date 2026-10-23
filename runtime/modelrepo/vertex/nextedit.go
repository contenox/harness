package vertex

import (
	"context"

	"github.com/contenox/harness/runtime/modelrepo"
)

// CanNextEdit reports that this adapter has no declared edit endpoint.
func (p *vertexProvider) CanNextEdit() bool { return false }

// GetNextEditConnection refuses unsupported independent edit prediction.
func (p *vertexProvider) GetNextEditConnection(context.Context, string) (modelrepo.LLMNextEditClient, error) {
	return nil, modelrepo.ErrNextEditUnsupported
}
