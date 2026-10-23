package modelrepo_test

import (
	"errors"
	"fmt"
	"testing"

	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A provider's error body is a diagnostic, not a payload: the caller must read
// the message and code the provider reported instead of the raw JSON.
func TestUnit_ClassifyProviderError_SurfacesTheProviderMessageAndCode(t *testing.T) {
	body := []byte(`{"error":{"message":"Invalid API key provided","type":"invalid_request_error","code":"invalid_api_key"}}`)
	code, message := modelrepo.ProviderErrorDetail(body)
	assert.Equal(t, "invalid_api_key", code)
	assert.Equal(t, "Invalid API key provided", message)

	err := modelrepo.ClassifyProviderError(errors.New("provider refused the request"), 401, code, message)
	require.Error(t, err)

	var provider *modelrepo.ProviderError
	require.True(t, errors.As(err, &provider), "the typed provider error must stay reachable: %v", err)
	assert.Equal(t, 401, provider.StatusCode)
	assert.Equal(t, "invalid_api_key", provider.Code)
	assert.Equal(t, "Invalid API key provided", provider.Message)
	assert.Contains(t, err.Error(), "Invalid API key provided")
	assert.Contains(t, err.Error(), "invalid_api_key")
	assert.True(t, errors.Is(err, modelrepo.ErrModelAccessDenied), "the classification sentinel must stay reachable")
}

// A caller that hands the classifier the raw body instead of reading the
// envelope still gets the provider's message and code, not the blob.
func TestUnit_ClassifyProviderError_ReadsAnEnvelopePassedAsTheMessage(t *testing.T) {
	body := `{"error":{"message":"Rate limit reached for gpt-5","type":"requests","code":"rate_limit_exceeded"}}`
	err := modelrepo.ClassifyProviderError(errors.New("OpenAI API returned non-200 status"), 429, "", body)

	var provider *modelrepo.ProviderError
	require.True(t, errors.As(err, &provider))
	assert.Equal(t, "rate_limit_exceeded", provider.Code)
	assert.Equal(t, "Rate limit reached for gpt-5", provider.Message)
	assert.NotContains(t, provider.Error(), `{"error"`)
	assert.ErrorIs(t, err, modelrepo.ErrRateLimited)
}

// A body that carries no envelope leaves the provider's text as the message;
// nothing is invented for it.
func TestUnit_ProviderErrorDetail_KeepsAnUnenvelopedBodyVerbatim(t *testing.T) {
	code, message := modelrepo.ProviderErrorDetail([]byte("  upstream is unwell  "))
	assert.Empty(t, code)
	assert.Equal(t, "upstream is unwell", message)
}

// The dialects type the code member as a string, a number or null.
func TestUnit_ProviderErrorDetail_AcceptsEveryCodeShape(t *testing.T) {
	for _, tc := range []struct {
		body string
		want string
	}{
		{`{"error":{"message":"m","code":1234}}`, "1234"},
		{`{"error":{"message":"m","code":null,"type":"rate_limit_error"}}`, "rate_limit_error"},
		{`{"error":{"message":"m","code":"","type":"server_error"}}`, "server_error"},
		{`{"error":{"message":"m"}}`, ""},
	} {
		code, message := modelrepo.ProviderErrorDetail([]byte(tc.body))
		assert.Equal(t, tc.want, code, "body %s", tc.body)
		assert.Equal(t, "m", message, "body %s", tc.body)
	}
}

func TestUnit_ClassifyProviderError_KeepsTheClassificationForRetry(t *testing.T) {
	cases := []struct {
		name   string
		status int
		code   string
		msg    string
		want   error
	}{
		{"rate limit", 429, "", "", modelrepo.ErrRateLimited},
		{"overloaded code", 200, "overloaded_error", "", modelrepo.ErrRateLimited},
		{"context window", 400, "context_length_exceeded", "too long", modelrepo.ErrContextLengthExceeded},
		{"not found", 404, "", "", modelrepo.ErrModelNotFoundOnBackend},
		{"access denied", 403, "", "", modelrepo.ErrModelAccessDenied},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := modelrepo.ClassifyProviderError(errors.New("provider said no"), tc.status, tc.code, tc.msg)
			assert.ErrorIs(t, err, tc.want)

			var provider *modelrepo.ProviderError
			require.True(t, errors.As(err, &provider), "diagnostics must survive classification")
			assert.Equal(t, tc.status, provider.StatusCode)
		})
	}
}

// An unclassified failure is still the provider's error, so it is typed too.
func TestUnit_ClassifyProviderError_TypesAnUnclassifiedFailure(t *testing.T) {
	err := modelrepo.ClassifyProviderError(errors.New("HTTP request failed"), 500, "", "internal error")
	var provider *modelrepo.ProviderError
	require.True(t, errors.As(err, &provider))
	assert.Equal(t, 500, provider.StatusCode)
	assert.Equal(t, "internal error", provider.Message)
	assert.ErrorIs(t, err, provider)
}

func TestUnit_ClassifyProviderError_NilStaysNil(t *testing.T) {
	assert.NoError(t, modelrepo.ClassifyProviderError(nil, 500, "", "unused"))
}

// A truncated stream is a connection failure a fresh attempt can clear, and the
// seam reports it as such rather than leaving the retry classifier to read text.
func TestUnit_IsRetryableStreamFailure_NamesTruncation(t *testing.T) {
	assert.True(t, modelrepo.IsRetryableStreamFailure(modelrepo.ErrStreamTruncated))
	wrapped := fmt.Errorf("chat stream failed: %w", modelrepo.ErrStreamTruncated)
	assert.True(t, modelrepo.IsRetryableStreamFailure(wrapped))
	assert.False(t, modelrepo.IsRetryableStreamFailure(modelrepo.ErrRefused))
	assert.False(t, modelrepo.IsRetryableStreamFailure(nil))
}

// The provider diagnostics stay reachable through a truncation, because the
// classification sentinel wraps the typed error rather than replacing it.
func TestUnit_ProviderError_StaysReachableThroughTruncation(t *testing.T) {
	classified := modelrepo.ClassifyProviderError(errors.New("body ended"), 503, "server_error", "upstream closed")
	truncated := fmt.Errorf("%w: %w", modelrepo.ErrStreamTruncated, classified)
	assert.ErrorIs(t, truncated, modelrepo.ErrStreamTruncated)
	var provider *modelrepo.ProviderError
	assert.True(t, errors.As(truncated, &provider))
	assert.Equal(t, "upstream closed", provider.Message)
}
