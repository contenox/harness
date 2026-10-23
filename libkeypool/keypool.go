package libkeypool

import (
	"fmt"
	"hash/fnv"
	"slices"
	"strings"
	"sync/atomic"
	"time"
)

// Policy names how one upstream key is chosen from a pool. It is the vocabulary
// an operator writes in a provider declaration, so the values are wire strings
// and never renamed in place.
type Policy string

const (
	// PolicyStickyClient hashes the client identity onto one key, so a machine
	// keeps hitting the upstream prefix cache its previous turn warmed.
	PolicyStickyClient Policy = "sticky_client"
	// PolicyRoundRobin advances to the next healthy key per request.
	PolicyRoundRobin Policy = "round_robin"
)

// Policies is every rotation policy a declaration may name.
func Policies() []Policy {
	return []Policy{PolicyStickyClient, PolicyRoundRobin}
}

// ValidPolicy reports whether name is a policy a reader honours. The empty
// string is one of them: it is a pool that declared no policy, which selects
// round robin because that is the order the keys were stated in.
func ValidPolicy(name Policy) bool {
	return name == "" || slices.Contains(Policies(), name)
}

// KeyPool holds one provider's upstream API keys and picks among them, skipping
// keys a [ProviderCircuitBreaker] has quarantined. Whether a provider may serve
// a turn at all is the provider-level breaker's decision and not the pool's, so
// a pool whose every key is quarantined still names one: the caller's breaker
// refuses the turn before the key matters.
type KeyPool struct {
	keys    []string
	policy  Policy
	counter uint64
	breaker *ProviderCircuitBreaker
}

// NewKeyPool creates a pool from a provider's declared keys and rotation policy,
// spelled as [Policies] spells them. Blank and duplicate keys are dropped; a
// policy outside that vocabulary is refused rather than stored inert, and so is
// an empty pool, because neither selects a key an operator could predict.
func NewKeyPool(keys []string, policy Policy, breaker *ProviderCircuitBreaker) (*KeyPool, error) {
	if !ValidPolicy(policy) {
		names := make([]string, 0, len(Policies()))
		for _, known := range Policies() {
			names = append(names, string(known))
		}
		return nil, fmt.Errorf("keypool: rotation policy %q is not one of %s", policy, strings.Join(names, ", "))
	}
	cleaned := make([]string, 0, len(keys))
	seen := make(map[string]bool, len(keys))
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		cleaned = append(cleaned, key)
	}
	if len(cleaned) == 0 {
		return nil, fmt.Errorf("keypool: pool for policy %q holds no key", policy)
	}
	return &KeyPool{keys: cleaned, policy: policy, breaker: breaker}, nil
}

// Keys returns the pool's keys in the order they were declared.
func (p *KeyPool) Keys() []string {
	if p == nil {
		return nil
	}
	return slices.Clone(p.keys)
}

// Policy returns the rotation policy the pool selects under.
func (p *KeyPool) Policy() Policy {
	if p == nil {
		return ""
	}
	return p.policy
}

// SelectKey names the key identity should use at now, preferring one the breaker
// has not quarantined. A nil pool names no key.
func (p *KeyPool) SelectKey(identity string, now time.Time) string {
	if p == nil || len(p.keys) == 0 {
		return ""
	}
	if len(p.keys) == 1 {
		return p.keys[0]
	}

	healthy := make([]string, 0, len(p.keys))
	for _, key := range p.keys {
		if p.breaker == nil || p.breaker.AllowAt(key, now) {
			healthy = append(healthy, key)
		}
	}
	if len(healthy) == 0 {
		healthy = p.keys
	}

	if p.policy != PolicyStickyClient || identity == "" {
		idx := atomic.AddUint64(&p.counter, 1) % uint64(len(healthy))
		return healthy[idx]
	}

	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(identity))
	return healthy[hasher.Sum32()%uint32(len(healthy))]
}
