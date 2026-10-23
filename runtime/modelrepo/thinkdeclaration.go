package modelrepo

import (
	"strings"
	"sync"
)

var (
	thinkDeclarationMu       sync.RWMutex
	thinkDeclarationRefusals = map[string]string{}
)

// RegisterThinkDeclarationRefusal records why an operator's reasoning
// declaration for a model cannot change the requests the adapter of backendType
// sends, so a surface refuses the declaration instead of accepting one that does
// nothing. Vendor packages call it from init() beside RegisterCatalogProvider.
func RegisterThinkDeclarationRefusal(backendType, reason string) {
	normalized := CanonicalBackendType(backendType)
	if normalized == "" || strings.TrimSpace(reason) == "" {
		panic("modelrepo: a think declaration refusal needs a backend type and a reason")
	}
	thinkDeclarationMu.Lock()
	defer thinkDeclarationMu.Unlock()
	if _, exists := thinkDeclarationRefusals[normalized]; exists {
		panic("modelrepo: think declaration refusal already registered for type " + normalized)
	}
	thinkDeclarationRefusals[normalized] = reason
}

// ThinkDeclarationRefusal returns why a reasoning declaration cannot change
// what the adapter of backendType sends; ok is false when the adapter acts on
// the declaration.
func ThinkDeclarationRefusal(backendType string) (reason string, ok bool) {
	thinkDeclarationMu.RLock()
	defer thinkDeclarationMu.RUnlock()
	reason, ok = thinkDeclarationRefusals[CanonicalBackendType(backendType)]
	return reason, ok
}
