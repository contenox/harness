package modelrepo

import "strings"

// ModelResourcePrefix is the collection prefix a catalog may put before a model id in the resource name it lists.
const ModelResourcePrefix = "models/"

// ModelID returns the id a model is listed, assigned and requested under: its resource name without the collection prefix.
func ModelID(name string) string {
	return strings.TrimPrefix(strings.TrimSpace(name), ModelResourcePrefix)
}

// SameModel reports whether two names denote one model, a resource name and its bare id being the same model.
func SameModel(a, b string) bool {
	return ModelID(a) == ModelID(b)
}
