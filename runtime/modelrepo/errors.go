package modelrepo

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

// Typed provider-error sentinels; providers translate documented error shapes into these via ClassifyProviderError.
var (
	// ErrContextLengthExceeded means the request does not fit the model's context window.
	ErrContextLengthExceeded = errors.New("request exceeds the model's context window")
	// ErrRateLimited means the provider refused the request for rate or capacity reasons.
	ErrRateLimited = errors.New("provider rate limit or capacity limit hit")
	// ErrModelNotFoundOnBackend means the backend does not serve the requested model; terminal for that backend, not for the request.
	ErrModelNotFoundOnBackend = errors.New("backend does not serve the requested model")
	// ErrModelAccessDenied means the backend refused access to the requested model; terminal for that backend, not for the request.
	ErrModelAccessDenied = errors.New("backend denied access to the requested model")
	// ErrPaymentRequired means the provider will not serve until the account's billing is settled; terminal until the account changes.
	ErrPaymentRequired = errors.New("provider account requires payment")
	// ErrRequestTooLarge means the request exceeded the provider's documented request-size limit, so the same body cannot succeed.
	ErrRequestTooLarge = errors.New("request exceeds the provider's size limit")
)

// IsBackendTerminal reports whether err is terminal for the backend that produced it, not necessarily for the request.
func IsBackendTerminal(err error) bool {
	return errors.Is(err, ErrModelNotFoundOnBackend) || errors.Is(err, ErrModelAccessDenied)
}

// IsRetryableStreamFailure reports whether err is a connection-level stream
// failure that a fresh attempt can clear. A truncated stream delivered part of
// a turn and then stopped, which is the same class of failure as a scan error
// or a decoding failure part way through; classifying it as permanent would
// discard the retry the truncation is detected for.
func IsRetryableStreamFailure(err error) bool {
	return errors.Is(err, ErrStreamTruncated)
}

var contextLimitMarkers = []string{
	"context_length_exceeded",
	"maximum context length",
	"prompt is too long",
	"exceed context limit",
	"exceeds context limit",
	"input is too long",
	"input length and `max_tokens` exceed",
	"input length and max_tokens exceed",
	"token count exceeds",
	"exceeds the maximum number of tokens",
	"please reduce the length",
	"context window",
	"context length",
	"kv cache",
}

// IsContextLimitMessage reports whether a provider error code or message
// matches a documented context-window-overflow phrasing.
func IsContextLimitMessage(s string) bool {
	s = strings.ToLower(s)
	if s == "" {
		return false
	}
	for _, m := range contextLimitMarkers {
		if strings.Contains(s, m) {
			return true
		}
	}
	return false
}

var rateLimitMarkers = []string{
	"resource_exhausted",
	"rate_limit_error",
	"overloaded_error",
	"throttl",
}

func isRateLimitCode(s string) bool {
	s = strings.ToLower(s)
	if s == "" {
		return false
	}
	for _, m := range rateLimitMarkers {
		if strings.Contains(s, m) {
			return true
		}
	}
	return false
}

var notFoundCodeMarkers = []string{"not_found"}

var notFoundMessageMarkers = []string{"not found", "does not exist"}

var accessDeniedCodeMarkers = []string{"permission_denied", "access_denied"}

// paymentRequiredCodeMarkers are the vendor error types that mean the account
// cannot be served until it is settled.
var paymentRequiredCodeMarkers = []string{"billing_error", "insufficient_quota", "payment_required"}

// requestTooLargeCodeMarkers are the vendor error types that mean the body
// itself is over a documented limit.
var requestTooLargeCodeMarkers = []string{"request_too_large"}

func containsMarker(s string, markers []string) bool {
	s = strings.ToLower(s)
	if s == "" {
		return false
	}
	for _, m := range markers {
		if strings.Contains(s, m) {
			return true
		}
	}
	return false
}

// ClassifyProviderError wraps err with the matching typed sentinel based on HTTP status and provider code/message, or returns err unchanged. A caller
// that could not read the body's error envelope passes the body as the
// message; the envelope is read here so the typed error still names the
// provider's own code and message. Diagnostics the cause already carries — an
// HTTPError whose text was sanitised at the edge — are authoritative, and the
// caller's raw arguments never displace them.
func ClassifyProviderError(err error, httpStatus int, code, message string) error {
	if err == nil {
		return nil
	}
	var carried *HTTPError
	if errors.As(err, &carried) {
		httpStatus = carried.StatusCode
		code = carried.Code
		message = carried.Message
	} else {
		if code == "" || message == "" {
			detailCode, detailMessage := ProviderErrorDetail([]byte(message))
			if code == "" {
				code = detailCode
			}
			if bodyMessage, ok := envelopeMessage([]byte(message)); ok {
				message = bodyMessage
			} else if message == "" {
				message = detailMessage
			}
		}
	}
	cause := &ProviderError{StatusCode: httpStatus, Code: code, Message: message, err: err}
	if httpStatus == 429 || httpStatus == 529 || isRateLimitCode(code) {
		return fmt.Errorf("%w: %w", ErrRateLimited, cause)
	}
	if httpStatus == 0 || (httpStatus >= 400 && httpStatus < 500) {
		if IsContextLimitMessage(code) || IsContextLimitMessage(message) {
			return fmt.Errorf("%w: %w", ErrContextLengthExceeded, cause)
		}
	}
	if httpStatus == 402 || containsMarker(code, paymentRequiredCodeMarkers) {
		return fmt.Errorf("%w: %w", ErrPaymentRequired, cause)
	}
	if httpStatus == 413 || containsMarker(code, requestTooLargeCodeMarkers) {
		return fmt.Errorf("%w: %w", ErrRequestTooLarge, cause)
	}
	if httpStatus == 404 || containsMarker(code, notFoundCodeMarkers) ||
		(httpStatus == 0 && containsMarker(message, notFoundMessageMarkers)) {
		return fmt.Errorf("%w: %w", ErrModelNotFoundOnBackend, cause)
	}
	if httpStatus == 401 || httpStatus == 403 || containsMarker(code, accessDeniedCodeMarkers) {
		return fmt.Errorf("%w: %w", ErrModelAccessDenied, cause)
	}
	return cause
}

// ProviderError carries a provider's own error diagnostics so a caller reads
// the reported message and code instead of the raw response body. The sentinel
// a caller matches on wraps it, so both stay reachable.
type ProviderError struct {
	StatusCode int
	Code       string
	Message    string
	RequestID  string
	err        error
}

// Error renders the provider's diagnostic, and the underlying failure when one
// is wrapped.
func (e *ProviderError) Error() string {
	s := "provider error"
	if e.StatusCode != 0 {
		s += fmt.Sprintf(" (status %d)", e.StatusCode)
	}
	if e.Code != "" {
		s += " (" + e.Code + ")"
	}
	if e.Message != "" {
		s += ": " + e.Message
	}
	if e.RequestID != "" {
		s += " [request " + e.RequestID + "]"
	}
	if e.err != nil {
		s += ": " + e.err.Error()
	}
	return s
}

// Unwrap exposes the wrapped failure, so errors.Is and errors.As reach the
// sentinel a caller classifies on.
func (e *ProviderError) Unwrap() error {
	return e.err
}

// wireErrorBody is the error envelope the OpenAI-compatible dialects share.
type wireErrorBody struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    any    `json:"code"`
	} `json:"error"`
}

// wireValidationBody is the validation envelope the OpenAPI-derived dialects
// return with a 422: one entry per rejected member, carrying its location, the
// complaint and the validator's type.
type wireValidationBody struct {
	Detail []struct {
		Loc  []any  `json:"loc"`
		Msg  string `json:"msg"`
		Type string `json:"type"`
	} `json:"detail"`
}

// ProviderErrorDetail extracts the code and message a provider put in a
// response body, so an error names the provider's diagnosis instead of the raw
// body. A body that carries no envelope yields its verbatim text, which is all
// the provider said.
func ProviderErrorDetail(body []byte) (code, message string) {
	message = strings.TrimSpace(string(body))
	var envelope wireErrorBody
	if err := json.Unmarshal(body, &envelope); err == nil && envelope.Error.Message != "" {
		return wireErrorCode(envelope.Error.Code, envelope.Error.Type), envelope.Error.Message
	}
	if validation, code, ok := validationEnvelope(body); ok {
		return code, validation
	}
	return "", message
}

// envelopeMessage returns the message member of an error envelope, and whether
// the bytes carried one at all.
func envelopeMessage(body []byte) (string, bool) {
	var envelope wireErrorBody
	if err := json.Unmarshal(body, &envelope); err == nil && envelope.Error.Message != "" {
		return envelope.Error.Message, true
	}
	message, _, ok := validationEnvelope(body)
	return message, ok
}

// validationEnvelope renders the first complaint of a validation envelope,
// naming the member it rejects, so the operator reads which field the vendor
// refused instead of the raw body. The validator's own type is the closest
// thing the envelope carries to an error code.
func validationEnvelope(body []byte) (message, code string, ok bool) {
	var envelope wireValidationBody
	if err := json.Unmarshal(body, &envelope); err != nil || len(envelope.Detail) == 0 {
		return "", "", false
	}
	first := envelope.Detail[0]
	location := make([]string, 0, len(first.Loc))
	for _, part := range first.Loc {
		location = append(location, fmt.Sprintf("%v", part))
	}
	message = strings.TrimSpace(first.Msg)
	if len(location) > 0 {
		if message == "" {
			message = strings.Join(location, ".")
		} else {
			message = strings.Join(location, ".") + ": " + message
		}
	}
	if message == "" {
		return "", "", false
	}
	return message, strings.TrimSpace(first.Type), true
}

// wireErrorCode renders the code member, which the dialects type as a string,
// a number or null.
func wireErrorCode(code any, fallback string) string {
	switch v := code.(type) {
	case nil:
		return fallback
	case string:
		if v == "" {
			return fallback
		}
		return v
	default:
		return fmt.Sprintf("%v", v)
	}
}

// HTTPError preserves the provider's HTTP status independently of its diagnostic text.
type HTTPError struct {
	StatusCode int
	Code       string
	Message    string
	RequestID  string
}

// Error returns the status and available provider diagnostics.
func (e *HTTPError) Error() string {
	s := fmt.Sprintf("provider HTTP %d", e.StatusCode)
	if e.Code != "" {
		s += " (" + e.Code + ")"
	}
	if e.Message != "" {
		s += ": " + e.Message
	}
	if e.RequestID != "" {
		s += " [request " + e.RequestID + "]"
	}
	return s
}
