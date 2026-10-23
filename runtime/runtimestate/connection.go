package runtimestate

import (
	"strings"

	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/runtimetypes"
)

// ConnectionSelector identifies one saved connection independently of its name and adapter type.
func ConnectionSelector(id string) string {
	return "connection:" + strings.TrimSpace(id)
}

// MatchesBackend resolves a connection selector or a legacy provider type or registered name.
func MatchesBackend(selector string, backend runtimetypes.Backend) bool {
	selector = strings.TrimSpace(selector)
	if strings.HasPrefix(selector, "connection:") {
		return strings.TrimPrefix(selector, "connection:") == backend.ID
	}
	key := modelrepo.CanonicalBackendType(selector)
	return key != "" && (key == modelrepo.CanonicalBackendType(backend.Type) || key == modelrepo.CanonicalBackendType(backend.Name))
}
