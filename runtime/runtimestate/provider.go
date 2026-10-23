package runtimestate

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/contenox/harness/runtime/modelrepo"
)

// ProviderKeyPrefix begins the key of every connection credential record; BackendCredentialKey completes it.
const ProviderKeyPrefix = "cloud-provider:"

const (
	// CredentialStored is the source whose literal key lives in the record the operator saved.
	CredentialStored = "stored"
	// CredentialEnvironment is the source whose record names the variable that holds the key; the key itself is never stored.
	CredentialEnvironment = "environment"
	// CredentialAmbient is the source the cloud SDK resolves on its own, such as the AWS chain or Google application default credentials.
	CredentialAmbient = "ambient"
	// CredentialNone is the source of an endpoint that takes no credential.
	CredentialNone = "none"
	// CredentialDevice is the source whose credential comes from a provider sign-in rather than from the record.
	CredentialDevice = "device"
)

// ProviderConfig is one connection's credential record, stored under BackendCredentialKey.
// CredentialSource names where the connection's credential comes from; APIKey is read only for CredentialStored and APIKeyEnv only for CredentialEnvironment.
type ProviderConfig struct {
	CredentialSource string
	APIKey           string
	APIKeyEnv        string
	Type             string
}

// EnvironmentUnsetError reports an environment-sourced credential whose variable holds no value.
type EnvironmentUnsetError struct {
	Variable string
}

// Error names the variable a connection reads its credential from.
func (e *EnvironmentUnsetError) Error() string {
	return fmt.Sprintf("environment variable %s is unset or empty", e.Variable)
}

// Source is the credential source the record names. A record written without an explicit source is read by its fields, and an environment reference outranks a literal beside it, so a stale literal never overrides a variable the operator chose to reference.
func (pc ProviderConfig) Source(backendType string) string {
	switch {
	case pc.CredentialSource != "":
		return pc.CredentialSource
	case strings.TrimSpace(pc.APIKeyEnv) != "":
		return CredentialEnvironment
	case pc.APIKey != "":
		return CredentialStored
	}
	switch modelrepo.CanonicalBackendType(backendType) {
	case "bedrock", "vertex-google":
		return CredentialAmbient
	}
	return CredentialNone
}

// Credential is the credential a connection's requests carry: the stored literal for CredentialStored, the named variable's current value for CredentialEnvironment, and nothing for the sources that carry none in the record.
// A literal beside an environment reference is never used, and an unset variable is an *EnvironmentUnsetError rather than an empty credential.
func (pc ProviderConfig) Credential(backendType string) (string, error) {
	switch source := pc.Source(backendType); source {
	case CredentialStored:
		if pc.APIKey == "" {
			return "", errors.New("the credential record says its key is stored but holds none")
		}
		return pc.APIKey, nil
	case CredentialEnvironment:
		name := strings.TrimSpace(pc.APIKeyEnv)
		if name == "" {
			return "", errors.New("the credential record names an environment source but no variable")
		}
		value := os.Getenv(name)
		if strings.TrimSpace(value) == "" {
			return "", &EnvironmentUnsetError{Variable: name}
		}
		return value, nil
	case CredentialAmbient, CredentialNone, CredentialDevice:
		return "", nil
	default:
		return "", fmt.Errorf("the credential record names an unknown credential source %q", source)
	}
}

// MarshalJSON writes the record as stored: it is the product's credential path, and HTTP provider APIs return sanitized views.
func (pc ProviderConfig) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		CredentialSource string `json:"CredentialSource,omitempty"`
		APIKey           string `json:"APIKey"`
		APIKeyEnv        string `json:"APIKeyEnv,omitempty"`
		Type             string `json:"Type"`
	}{
		CredentialSource: pc.CredentialSource,
		APIKey:           pc.APIKey,
		APIKeyEnv:        pc.APIKeyEnv,
		Type:             pc.Type,
	})
}
