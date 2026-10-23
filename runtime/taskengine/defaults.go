package taskengine

// FallbackContextTokens bounds history when the backend reports no model
// context limit. It lived in the settings service package; the kernel must not
// depend on the service layer, so the default lives here.
const FallbackContextTokens = 131072
