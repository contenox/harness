package modelrepo

// IsLocalBackendType reports whether backendType denotes the legacy local
// inference family (llama / openvino / modeld / local). The v2 provider layer has
// no local engine of its own; the predicate is kept for callers that still
// classify rows written by that era.
func IsLocalBackendType(backendType string) bool {
	switch CanonicalBackendType(backendType) {
	case "llama", "openvino", "modeld", "local":
		return true
	default:
		return false
	}
}
