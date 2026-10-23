// Package libkeypool holds one upstream provider's API keys and the circuit
// breaker that quarantines a key or an upstream that keeps failing.
//
// It is the single implementation of key rotation in the tree: the runtime's
// credential path and the relay's proxy both select through it, so a provider's
// declared policy cannot mean one thing to the meter and another to the dial.
//
// Every method takes the time it acts at. Nothing here reads the wall clock, so
// a caller can prove stickiness and expiry against a clock it controls.
package libkeypool
