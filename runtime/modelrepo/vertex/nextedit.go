package vertex

import (
	"context"

	"github.com/contenox/harness/runtime/modelrepo"
)

func (p *vertexProvider) CanNextEdit() bool { return false }

func (p *vertexProvider) GetNextEditConnection(context.Context, string) (modelrepo.LLMNextEditClient, error) {
	return nil, modelrepo.ErrNextEditUnsupported
}
