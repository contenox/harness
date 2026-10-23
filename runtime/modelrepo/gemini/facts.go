package gemini

import (
	"fmt"
	"sort"
	"strings"

	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/reasoning"
)

// Vendor thinkingLevel enum values, ascending by the depth they request.
const (
	vendorLevelMinimal = "MINIMAL"
	vendorLevelLow     = "LOW"
	vendorLevelMedium  = "MEDIUM"
	vendorLevelHigh    = "HIGH"
)

// documentedAutoBudget is the token ceiling the vendor publishes for a model
// that was not given a thinking budget ("Auto (up to 8,192 tokens)"), which is
// what the runtime's medium level asks for.
const documentedAutoBudget = 8192

// documentedLowBudget is the vendor's own example budget, which is what the
// runtime's low level asks for.
const documentedLowBudget = 1024

// ModelFacts is what the vendor's own pages publish about one Gemini model
// family: the token limits its model page reports, and the thinking control its
// generateContent request takes. Both the Gemini API reference and the Vertex
// model pages describe the same models, so one table serves both adapters.
type ModelFacts struct {
	// ContextLength is the model page's context window, 0 when the page states none.
	ContextLength int
	// MaxOutputTokens is the model page's maximum output tokens, 0 when the page states none.
	MaxOutputTokens int
	// ThinkingLevels are the thinkingLevel values the model page lists for the
	// family, ascending; empty when the family takes a token budget instead.
	ThinkingLevels []string
	// ThinkingBudget marks a family configured with thinkingBudget rather than
	// thinkingLevel.
	ThinkingBudget bool
	// MinBudget and MaxBudget are the documented thinkingBudget bounds.
	MinBudget int
	MaxBudget int
	// DisableThinking marks a family whose documented budget range includes 0,
	// which is how the vendor turns thinking off for it.
	DisableThinking bool
}

// geminiModelFacts is the vendor's published facts per model family, keyed by
// the family prefix of the model id. Sources: the thinking page's supported
// levels and budgets tables
// (https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking)
// and the per-model Vertex pages that publish the token limits
// (https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/<model>).
var geminiModelFacts = map[string]ModelFacts{
	"gemini-4-argon": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.8-flash-cyber": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.8-flash": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.7-flash": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.6-flash": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.5-flash-lite": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.5-flash": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.1-pro": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.1-flash-lite-image": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelHigh},
	},
	"gemini-3.1-flash-lite": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-3.1-flash-image": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelHigh},
	},
	"gemini-3-pro-image": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelHigh},
	},
	"gemini-3-pro": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelLow, vendorLevelHigh},
	},
	"gemini-3-flash": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-robotics-er-2": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelLow, vendorLevelMedium, vendorLevelHigh},
	},
	"nano-banana-2.1": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingLevels:  []string{vendorLevelMinimal, vendorLevelMedium, vendorLevelHigh},
	},
	"gemini-2.5-pro": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingBudget:  true,
		MinBudget:       128,
		MaxBudget:       32768,
	},
	"gemini-2.5-flash-lite": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingBudget:  true,
		MinBudget:       512,
		MaxBudget:       24576,
		DisableThinking: true,
	},
	"gemini-2.5-flash": {
		ContextLength:   1048576,
		MaxOutputTokens: 65536,
		ThinkingBudget:  true,
		MinBudget:       1,
		MaxBudget:       24576,
		DisableThinking: true,
	},
}

// geminiModelFactKeys is the fact table's keys longest first, so a lookup reads
// gemini-3.1-flash-lite-image as itself and not as gemini-3.1-flash-lite.
var geminiModelFactKeys = func() []string {
	keys := make([]string, 0, len(geminiModelFacts))
	for key := range geminiModelFacts {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool {
		if len(keys[i]) != len(keys[j]) {
			return len(keys[i]) > len(keys[j])
		}
		return keys[i] < keys[j]
	})
	return keys
}()

// ModelFactsFor returns the vendor's published facts for a Gemini model id, and
// reports false for a family the vendor's pages do not cover.
func ModelFactsFor(model string) (ModelFacts, bool) {
	base := normalizeModelID(model)
	if fact, ok := geminiModelFacts[base]; ok {
		return fact, true
	}
	for _, key := range geminiModelFactKeys {
		if strings.HasPrefix(base, key+"-") {
			return geminiModelFacts[key], true
		}
	}
	return ModelFacts{}, false
}

// normalizeModelID strips the resource prefix and any served version suffix a
// model id may carry, so the family a request names is the key the fact table
// holds.
func normalizeModelID(model string) string {
	base := strings.ToLower(strings.TrimSpace(model))
	if idx := strings.LastIndex(base, "/"); idx >= 0 {
		base = base[idx+1:]
	}
	return base
}

// ThinkingDeclarationFor returns the thinking controls the vendor documents for
// a model, in the shared declaration's vocabulary; nil means the vendor's pages
// publish no thinking control for the family.
func ThinkingDeclarationFor(model string) *modelrepo.ThinkingTypes {
	fact, ok := ModelFactsFor(model)
	if !ok {
		return nil
	}
	declared := &modelrepo.ThinkingTypes{
		Enabled:  fact.ThinkingBudget,
		Disabled: fact.DisableThinking,
	}
	for _, level := range fact.ThinkingLevels {
		// The declaration's vocabulary starts at low: a model whose shallowest
		// documented level is MINIMAL declares the levels above it, and a
		// request for the runtime's minimal level takes the shallowest level
		// the model does declare.
		if runtimeLevel, ok := runtimeLevelFor(level); ok && runtimeLevel != reasoning.Minimal {
			declared.EffortLevels = append(declared.EffortLevels, runtimeLevel)
		}
	}
	if err := declared.Validate(); err != nil {
		return nil
	}
	if len(declared.EffortLevels) == 0 && !declared.Enabled {
		return nil
	}
	return declared
}

// ThinkingControl is the generateContent thinkingConfig one runtime reasoning
// level maps to for a model: a thinkingLevel, a thinkingBudget, or neither when
// the level is the provider default.
type ThinkingControl struct {
	// Level is the vendor's thinkingLevel enum value; empty when the model takes a budget.
	Level string
	// Budget is the thinkingBudget token count; nil when the model takes a level.
	Budget *int
	// IncludeThoughts asks the model to return its thoughts beside its answer.
	IncludeThoughts bool
}

// ThinkingControlFor renders a requested runtime reasoning level as the control
// the model's published facts accept. A level the vendor's pages do not give the
// model is refused, naming the model, rather than sent as a request the vendor
// rejects or silently replaced by a different level.
func ThinkingControlFor(model string, think *string) (*ThinkingControl, error) {
	if think == nil {
		return nil, nil
	}
	level, ok, err := reasoning.NormalizeOptional(*think)
	if err != nil {
		return nil, err
	}
	if !ok || level == reasoning.Auto {
		return nil, nil
	}

	fact, documented := ModelFactsFor(model)
	if !documented {
		return nil, fmt.Errorf("gemini: model %s publishes no thinking control", model)
	}
	// A model the vendor gives no way to turn thinking off is sent no control
	// at all: the model's own default stays in place, which is the only outcome
	// the vendor documents for it.
	if level == reasoning.Off && (!fact.ThinkingBudget || !fact.DisableThinking) {
		return nil, nil
	}
	if fact.ThinkingBudget {
		budget, err := budgetFor(model, fact, level)
		if err != nil {
			return nil, err
		}
		return &ThinkingControl{Budget: &budget, IncludeThoughts: level != reasoning.Off}, nil
	}

	vendorLevel, err := levelFor(model, fact, level)
	if err != nil {
		return nil, err
	}
	return &ThinkingControl{Level: vendorLevel, IncludeThoughts: true}, nil
}

// budgetFor maps a runtime level onto the model's documented token budget.
func budgetFor(model string, fact ModelFacts, level string) (int, error) {
	switch level {
	case reasoning.Off:
		return 0, nil
	case reasoning.Minimal:
		return fact.MinBudget, nil
	case reasoning.Low:
		return clampBudget(documentedLowBudget, fact), nil
	case reasoning.Medium:
		return clampBudget(documentedAutoBudget, fact), nil
	case reasoning.High, reasoning.XHigh, reasoning.Max:
		return fact.MaxBudget, nil
	default:
		return 0, &modelrepo.UnsupportedDialectLevelError{Dialect: "gemini", Level: level}
	}
}

// levelFor maps a runtime level onto one of the model's documented thinkingLevel
// values: the deepest value the model lists at or below the requested level, and
// the shallowest value it lists when the request is below all of them.
func levelFor(model string, fact ModelFacts, level string) (string, error) {
	requested, ok := vendorRank(level)
	if !ok {
		return "", &modelrepo.UnsupportedDialectLevelError{Dialect: "gemini", Level: level}
	}
	best := ""
	bestRank := -1
	lowest := ""
	lowestRank := 0
	for _, candidate := range fact.ThinkingLevels {
		rank, ok := vendorLevelRank(candidate)
		if !ok {
			continue
		}
		if lowest == "" || rank < lowestRank {
			lowest, lowestRank = candidate, rank
		}
		if rank <= requested && rank > bestRank {
			best, bestRank = candidate, rank
		}
	}
	if best != "" {
		return best, nil
	}
	if lowest != "" {
		return lowest, nil
	}
	return "", fmt.Errorf("gemini: model %s publishes no thinking level for level %q", model, level)
}

func clampBudget(budget int, fact ModelFacts) int {
	if budget < fact.MinBudget {
		return fact.MinBudget
	}
	if budget > fact.MaxBudget {
		return fact.MaxBudget
	}
	return budget
}

// runtimeLevelFor names the runtime level a vendor thinkingLevel value covers.
func runtimeLevelFor(vendorLevel string) (string, bool) {
	switch vendorLevel {
	case vendorLevelMinimal:
		return reasoning.Minimal, true
	case vendorLevelLow:
		return reasoning.Low, true
	case vendorLevelMedium:
		return reasoning.Medium, true
	case vendorLevelHigh:
		return reasoning.High, true
	default:
		return "", false
	}
}

// vendorRank is the ascending depth a runtime level asks for.
func vendorRank(level string) (int, bool) {
	switch level {
	case reasoning.Minimal:
		return 0, true
	case reasoning.Low:
		return 1, true
	case reasoning.Medium:
		return 2, true
	case reasoning.High:
		return 3, true
	case reasoning.XHigh:
		return 4, true
	case reasoning.Max:
		return 5, true
	default:
		return 0, false
	}
}

// vendorLevelRank is the ascending depth a vendor thinkingLevel value names.
func vendorLevelRank(vendorLevel string) (int, bool) {
	switch vendorLevel {
	case vendorLevelMinimal:
		return 0, true
	case vendorLevelLow:
		return 1, true
	case vendorLevelMedium:
		return 2, true
	case vendorLevelHigh:
		return 3, true
	default:
		return 0, false
	}
}
