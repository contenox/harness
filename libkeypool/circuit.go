package libkeypool

import (
	"fmt"
	"time"

	"github.com/contenox/harness/libroutine"
)

// ProviderCircuitBreaker quarantines an upstream that keeps failing, so a dead
// or rate-limited one stops receiving turns while the caller can offer another.
// It is libroutine's three-state circuit (Closed, Open, HalfOpen) keyed by
// whatever identity the caller quarantines: a provider id, a backend id, or one
// upstream API key.
//
// Classifying a failure is the caller's decision, not this type's: the caller
// knows its provider vocabulary and calls [ProviderCircuitBreaker.OpenAt] for a
// failure that is terminal for the upstream, or
// [ProviderCircuitBreaker.MarkFailureAt] for one that counts toward the
// threshold.
type ProviderCircuitBreaker struct {
	pool *libroutine.Pool
}

// NewProviderCircuitBreaker creates a circuit breaker that opens after
// threshold consecutive counted failures and admits one trial request after
// cooldown. A non-positive threshold or cooldown is refused rather than
// defaulted: how long an upstream may be quarantined is the operator's policy.
func NewProviderCircuitBreaker(threshold int, cooldown time.Duration) (*ProviderCircuitBreaker, error) {
	if threshold <= 0 {
		return nil, fmt.Errorf("keypool: circuit breaker threshold %d must be positive", threshold)
	}
	if cooldown <= 0 {
		return nil, fmt.Errorf("keypool: circuit breaker cooldown %s must be positive", cooldown)
	}
	return &ProviderCircuitBreaker{pool: libroutine.NewPool(threshold, cooldown)}, nil
}

// AllowAt reports whether identity may receive a request at now. A nil breaker
// holds no quarantine and admits everything — the posture of a caller assembled
// without one.
func (cb *ProviderCircuitBreaker) AllowAt(identity string, now time.Time) bool {
	if cb == nil {
		return true
	}
	return cb.pool.AllowAt(identity, now)
}

// MarkSuccess clears identity's consecutive failure count.
func (cb *ProviderCircuitBreaker) MarkSuccess(identity string) {
	if cb == nil {
		return
	}
	cb.pool.MarkSuccess(identity)
}

// MarkFailureAt counts one failure for identity and reports whether identity is
// now quarantined.
func (cb *ProviderCircuitBreaker) MarkFailureAt(identity string, now time.Time) bool {
	if cb == nil || identity == "" {
		return false
	}
	r := cb.pool.Get(identity)
	r.MarkFailureAt(now)
	return r.GetState() == libroutine.Open
}

// OpenAt quarantines identity on the first failure, for a failure the caller
// classifies as terminal for the upstream until the cooldown expires.
func (cb *ProviderCircuitBreaker) OpenAt(identity string, now time.Time) {
	if cb == nil || identity == "" {
		return
	}
	cb.pool.Get(identity).ForceOpenAt(now)
}

// State reports identity's circuit state in libroutine's own words — Closed,
// Open or HalfOpen — which is what a caller prints when it explains why an
// upstream is being skipped.
func (cb *ProviderCircuitBreaker) State(identity string, now time.Time) string {
	if cb == nil || identity == "" {
		return libroutine.Closed.String()
	}
	r := cb.pool.Get(identity)
	r.AllowAt(now)
	return r.GetState().String()
}
