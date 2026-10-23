package bedrock_test

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/contenox/harness/runtime/modelrepo"
)

// isAWSCredentialError reports whether err is an environment problem (missing,
// expired or rejected credentials) rather than a product defect, so this test
// skips instead of failing on a machine without an AWS login.
func isAWSCredentialError(err error) bool {
	message := err.Error()
	for _, marker := range []string{
		"get credentials",
		"no EC2 IMDS role found",
		"failed to refresh cached credentials",
		"expired",
		"InvalidClientTokenId",
		"UnrecognizedClientException",
		"AccessDeniedException",
	} {
		if strings.Contains(message, marker) {
			return true
		}
	}
	return false
}

// The vendor's own model list is the only source the catalogue reads: this
// exercises it against the live control plane, which needs an AWS credential
// unless the machine has one.
func TestSystem_BedrockCatalog_RegisteredAndChatCapable(t *testing.T) {
	catalogue, err := modelrepo.NewCatalogProvider(modelrepo.BackendSpec{
		Type:    "bedrock",
		BaseURL: "https://bedrock-runtime.us-east-1.amazonaws.com",
	})
	require.NoError(t, err, "bedrock must be registered in the catalog registry")
	require.Equal(t, "bedrock", catalogue.Type())

	models, err := catalogue.ListModels(context.Background())
	if err != nil && isAWSCredentialError(err) {
		t.Skipf("skipping: no usable AWS credentials for Bedrock (%v)", err)
	}
	require.NoError(t, err)
	require.NotEmpty(t, models)

	chatCapable := 0
	for _, model := range models {
		require.False(t, model.CanThink, "the vendor publishes no reasoning field, so the catalogue declares none")
		require.False(t, model.CanEmbed, "bedrock embeddings are unimplemented; the catalog must not advertise them")
		if model.CanChat {
			chatCapable++
		}
	}
	require.Positive(t, chatCapable)

	provider := catalogue.ProviderFor(models[0])
	require.Equal(t, "bedrock", provider.GetType())
	require.False(t, provider.CanEmbed())
	require.False(t, provider.CanThink())
	require.Equal(t, models[0].CanChat, provider.CanChat())
}
