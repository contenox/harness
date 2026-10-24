package anthropic

import (
	"context"

	"github.com/contenox/harness/runtime/modelrepo"
)

func (p *anthropicProvider) CanNextEdit() bool { return false }

func (p *anthropicProvider) GetNextEditConnection(context.Context, string) (modelrepo.LLMNextEditClient, error) {
	return nil, modelrepo.ErrNextEditUnsupported
}
