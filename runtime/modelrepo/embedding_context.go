package modelrepo

import "context"

// EmbeddingPurpose identifies document indexing or search-query encoding.
type EmbeddingPurpose string

const (
	// EmbeddingDocument is the document-encoding contract of an ordinary Embed request.
	EmbeddingDocument EmbeddingPurpose = "document"
	// EmbeddingQuery selects the configured model's retrieval-query formatting.
	EmbeddingQuery EmbeddingPurpose = "query"
)

type embeddingPurposeKey struct{}

// WithEmbeddingPurpose carries retrieval input purpose through the model repository boundary.
func WithEmbeddingPurpose(ctx context.Context, purpose EmbeddingPurpose) context.Context {
	return context.WithValue(ctx, embeddingPurposeKey{}, purpose)
}

// EmbeddingPurposeFromContext returns the input purpose; an ordinary Embed request encodes a document.
func EmbeddingPurposeFromContext(ctx context.Context) EmbeddingPurpose {
	if purpose, ok := ctx.Value(embeddingPurposeKey{}).(EmbeddingPurpose); ok {
		return purpose
	}
	return EmbeddingDocument
}
