package modelrepo

// ObservedDisplayNameMetaKey is the ObservedModel.Meta key a catalogue reader
// sets to the vendor's own display name for a model, which a picker shows in
// place of the request identifier.
const ObservedDisplayNameMetaKey = "display_name"

// ObservedFunctionCallingMetaKey is the ObservedModel.Meta key a catalogue
// reader sets to whether the vendor's own model list declares function calling
// for that model. A vendor that publishes the field decides it; a consumer that
// needs the answer reads this instead of inferring it from the chat capability.
const ObservedFunctionCallingMetaKey = "function_calling"
