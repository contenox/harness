package vertex

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const cloudPlatformScope = "https://www.googleapis.com/auth/cloud-platform"

// NewTokenSource returns a caching oauth2.TokenSource. Call it once per provider
// and reuse it: the BearerToken* helpers mint a source per call and add auth
// latency to every call. credJSON is the service account key JSON; empty uses ADC.
func NewTokenSource(ctx context.Context, credJSON string) (oauth2.TokenSource, error) {
	if credJSON != "" {
		creds, err := credentialDocument(ctx, credJSON)
		if err != nil {
			return nil, fmt.Errorf("vertex AI service account credentials: %w", err)
		}
		return creds.TokenSource, nil
	}
	ts, err := google.DefaultTokenSource(ctx, cloudPlatformScope)
	if err != nil {
		return nil, fmt.Errorf("vertex AI ADC: %w", err)
	}
	return ts, nil
}

// ValidateCredentialJSON validates a supported Google credential document without minting a token.
func ValidateCredentialJSON(ctx context.Context, document string) error {
	_, err := credentialDocument(ctx, document)
	return err
}

func credentialDocument(ctx context.Context, raw string) (*google.Credentials, error) {
	var header struct {
		Type google.CredentialsType `json:"type"`
	}
	if err := json.Unmarshal([]byte(raw), &header); err != nil {
		return nil, fmt.Errorf("invalid Google credential JSON")
	}
	switch header.Type {
	case google.ServiceAccount, google.AuthorizedUser, google.ExternalAccount, google.ExternalAccountAuthorizedUser, google.ImpersonatedServiceAccount, google.GDCHServiceAccount:
		return google.CredentialsFromJSONWithType(ctx, []byte(raw), header.Type, cloudPlatformScope)
	default:
		return nil, fmt.Errorf("unsupported Google credential document type")
	}
}

func extractProjectFromVertexURL(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	parts := strings.Split(u.Path, "/")
	for i, p := range parts {
		if p == "projects" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	return ""
}

// BearerToken returns a fresh ADC access token for Vertex AI.
func BearerToken(ctx context.Context) (string, error) {
	return BearerTokenWithCreds(ctx, "")
}

// BearerTokenWithCreds returns an access token using the provided service account
// JSON when non-empty, or ADC when empty.
func BearerTokenWithCreds(ctx context.Context, credJSON string) (string, error) {
	ts, err := NewTokenSource(ctx, credJSON)
	if err != nil {
		return "", fmt.Errorf("vertex AI ADC: %w", err)
	}
	tok, err := ts.Token()
	if err != nil {
		return "", fmt.Errorf("vertex AI token refresh: %w", err)
	}
	return tok.AccessToken, nil
}

// IsExpressAPIKey reports whether a stored vertex-google secret is an Agent
// Platform express mode API key rather than a Google credential document. The
// two are told apart by shape: a credential document is a JSON object whose
// type names a supported credential kind, and express mode's key is opaque.
func IsExpressAPIKey(secret string) bool {
	trimmed := strings.TrimSpace(secret)
	if trimmed == "" {
		return false
	}
	var document struct {
		Type json.RawMessage `json:"type"`
	}
	if err := json.Unmarshal([]byte(trimmed), &document); err != nil {
		return true
	}
	return len(document.Type) == 0
}

// UsesUserCredential reports whether a stored credential document is a Google
// user credential, which is the one credential kind the vendor documents a
// quota project for.
func UsesUserCredential(ctx context.Context, credJSON string) (bool, error) {
	if strings.TrimSpace(credJSON) == "" {
		return false, nil
	}
	creds, err := credentialDocument(ctx, credJSON)
	if err != nil {
		return false, err
	}
	return isUserCredentialDocument(creds.JSON), nil
}

// QuotaProjectFor returns the project a request must name in
// x-goog-user-project, or an empty string when the vendor documents no such
// header for the backend's credential: a service account is billed to its own
// project, and an ambient ADC user credential names its quota project in the
// ADC setup itself, which an endpoint's project segment must not override.
func QuotaProjectFor(ctx context.Context, credJSON, baseURL string) (string, error) {
	if IsExpressAPIKey(credJSON) {
		return "", nil
	}
	project := extractProjectFromVertexURL(baseURL)
	if project == "" {
		return "", nil
	}
	user, err := UsesUserCredential(ctx, credJSON)
	if err != nil {
		return "", err
	}
	if !user {
		return "", nil
	}
	return project, nil
}

func isUserCredentialDocument(raw []byte) bool {
	var document struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(raw, &document); err != nil {
		return false
	}
	return document.Type == string(google.AuthorizedUser)
}

// ApplyVertexAuth sets the documented authentication headers for one request:
// the express mode API key when the backend stores one, otherwise a bearer
// token, and the quota project only for the user credential that must name one.
func ApplyVertexAuth(ctx context.Context, req *http.Request, apiKey, quotaProject string, bearer func(context.Context) (string, error)) error {
	if apiKey != "" {
		req.Header.Set("X-Goog-Api-Key", apiKey)
		return nil
	}
	token, err := bearer(ctx)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if quotaProject != "" {
		req.Header.Set("x-goog-user-project", quotaProject)
	}
	return nil
}
