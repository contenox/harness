package bedrock

import (
	"context"

	"github.com/contenox/harness/runtime/modelrepo"
)

// CanNextEdit reports that this adapter has no declared edit endpoint.
func (p *bedrockProvider) CanNextEdit() bool { return false }

// GetNextEditConnection refuses unsupported independent edit prediction.
func (p *bedrockProvider) GetNextEditConnection(context.Context, string) (modelrepo.LLMNextEditClient, error) {
	return nil, modelrepo.ErrNextEditUnsupported
}
