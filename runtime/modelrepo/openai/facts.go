package openai

import (
	"fmt"
	"slices"
	"sort"
	"strings"

	"github.com/contenox/harness/runtime/modelrepo"
	"github.com/contenox/harness/runtime/reasoning"
)

// reasoningOffLiteral is the vendor's reasoning.effort literal that turns
// reasoning off; the runtime spells the same level "off".
const reasoningOffLiteral = "none"

// openAIModelFact is what OpenAI's own model page publishes about one model
// family: the reasoning.effort literals it accepts, its max output tokens, its
// input modalities, and the endpoints it serves. GET /v1/models reports none of
// it, so the runtime reads the vendor's pages once, here, instead of inferring a
// member from a model id at each point of use.
//
// Sources: https://developers.openai.com/api/docs/models/<model> for the effort
// literals, output ceiling and input modalities; .../guides/reasoning for the
// effort support the model pages leave unstated and for the one model that
// rejects none; .../guides/function-calling for the models whose tool calling
// the Responses API alone serves.
type openAIModelFact struct {
	// Reasoning marks a model whose page documents reasoning token support.
	Reasoning bool
	// Efforts are the reasoning.effort literals the page names for the model,
	// empty when the page names none. A named level is one the model accepts; a
	// request for a level outside the list is refused rather than downgraded.
	Efforts []string
	// MaxOutputTokens is the page's max output tokens; 0 means the page states none.
	MaxOutputTokens int
	// Vision marks a model whose page lists image among the input modalities.
	Vision bool
	// ResponsesOnly marks a model whose page reports Chat Completions as unsupported.
	ResponsesOnly bool
	// ChatOnly marks a model whose page reports the Responses endpoint as
	// unsupported, so a reasoning model with no Responses route stays on Chat
	// Completions instead of being sent to an endpoint the vendor rejects.
	ChatOnly bool
	// ToolsRequireResponses marks a model the function-calling guide reports as
	// unable to call functions on Chat Completions.
	ToolsRequireResponses bool
}

// openAIModelFacts is the documented facts of every OpenAI model family the
// runtime routes. A family is keyed by the model id prefix the vendor publishes,
// including its snapshot prefix, so gpt-5.5-2026-04-23 is read as gpt-5.5.
var openAIModelFacts = map[string]openAIModelFact{
	"gpt-6-astra": {
		Reasoning:             true,
		Efforts:               []string{reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh, reasoning.Max},
		MaxOutputTokens:       128000,
		Vision:                true,
		ToolsRequireResponses: true,
	},
	"gpt-6-sol": {
		Reasoning:             true,
		Efforts:               []string{reasoningOffLiteral, reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh, reasoning.Max},
		MaxOutputTokens:       128000,
		Vision:                true,
		ToolsRequireResponses: true,
	},
	"gpt-6.1-sol": {
		Reasoning:             true,
		Efforts:               []string{reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh, reasoning.Max},
		MaxOutputTokens:       128000,
		Vision:                true,
		ToolsRequireResponses: true,
	},
	"gpt-6-luna": {
		Reasoning:             true,
		Efforts:               []string{reasoningOffLiteral, reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh, reasoning.Max},
		MaxOutputTokens:       128000,
		Vision:                true,
		ToolsRequireResponses: true,
	},
	"gpt-5.6": {
		Reasoning:       true,
		Efforts:         []string{reasoningOffLiteral, reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh, reasoning.Max},
		MaxOutputTokens: 128000,
		Vision:          true,
	},
	"gpt-5.6-cyber": {
		Reasoning:       true,
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5.5": {
		Reasoning:       true,
		Efforts:         []string{reasoningOffLiteral, reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh},
		MaxOutputTokens: 128000,
		Vision:          true,
	},
	"gpt-5.5-pro": {
		Reasoning:       true,
		Efforts:         []string{reasoning.Medium, reasoning.High, reasoning.XHigh},
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5.4": {
		Reasoning:       true,
		Efforts:         []string{reasoningOffLiteral, reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh},
		MaxOutputTokens: 128000,
		Vision:          true,
	},
	"gpt-5.4-pro": {
		Reasoning:       true,
		Efforts:         []string{reasoning.Medium, reasoning.High, reasoning.XHigh},
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5.3-codex": {
		Reasoning:       true,
		Efforts:         []string{reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh},
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5.2": {
		Reasoning:       true,
		Efforts:         []string{reasoningOffLiteral, reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh},
		MaxOutputTokens: 128000,
		Vision:          true,
	},
	"gpt-5.2-pro": {
		Reasoning:       true,
		Efforts:         []string{reasoning.Medium, reasoning.High, reasoning.XHigh},
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5.2-codex": {
		Reasoning:       true,
		Efforts:         []string{reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh},
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5.1-codex-max": {
		Reasoning:       true,
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5.1-codex": {
		Reasoning:       true,
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5.1": {
		Reasoning:       true,
		Efforts:         []string{reasoningOffLiteral, reasoning.Low, reasoning.Medium, reasoning.High},
		MaxOutputTokens: 128000,
		Vision:          true,
	},
	"gpt-5-chat": {
		MaxOutputTokens: 16384,
		Vision:          true,
	},
	"gpt-5-codex": {
		Reasoning:       true,
		MaxOutputTokens: 128000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5-mini": {
		Reasoning:       true,
		MaxOutputTokens: 128000,
		Vision:          true,
	},
	"gpt-5-nano": {
		Reasoning:       true,
		MaxOutputTokens: 128000,
		Vision:          true,
	},
	"gpt-5-pro": {
		Reasoning:       true,
		Efforts:         []string{reasoning.High},
		MaxOutputTokens: 272000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"gpt-5": {
		Reasoning:       true,
		Efforts:         []string{reasoning.Minimal, reasoning.Low, reasoning.Medium, reasoning.High},
		MaxOutputTokens: 128000,
		Vision:          true,
	},
	"o4-mini": {
		Reasoning:       true,
		MaxOutputTokens: 100000,
		Vision:          true,
	},
	"o3-pro": {
		Reasoning:       true,
		MaxOutputTokens: 100000,
		Vision:          true,
		ResponsesOnly:   true,
	},
	"o3-mini": {
		Reasoning:       true,
		MaxOutputTokens: 100000,
	},
	"o3": {
		Reasoning:       true,
		MaxOutputTokens: 100000,
		Vision:          true,
	},
	"o1-preview": {
		Reasoning:       true,
		MaxOutputTokens: 32768,
		ChatOnly:        true,
	},
	"o1-mini": {
		Reasoning:       true,
		MaxOutputTokens: 65536,
		ChatOnly:        true,
	},
	"o1": {
		Reasoning:       true,
		MaxOutputTokens: 100000,
		Vision:          true,
	},
	"gpt-4.1": {
		MaxOutputTokens: 32768,
		Vision:          true,
	},
	"gpt-4o": {
		MaxOutputTokens: 16384,
		Vision:          true,
	},
	"gpt-4-turbo-preview": {},
	"gpt-4-turbo": {
		Vision: true,
	},
	"chatgpt-4o": {
		Vision: true,
	},
	"computer-use": {
		Vision: true,
	},
}

// openAIModelFactKeys is the fact table's keys longest first, so a lookup reads
// gpt-5.1-codex-max as itself and not as gpt-5.1.
var openAIModelFactKeys = func() []string {
	keys := make([]string, 0, len(openAIModelFacts))
	for key := range openAIModelFacts {
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

// openAIModelFactFor returns the documented facts of a model id. The second
// result is false for a model no page covers, which every caller treats as
// nothing documented rather than as another family's facts.
func openAIModelFactFor(model string) (openAIModelFact, bool) {
	base := openAIAPIBaseModelID(model)
	if fact, ok := openAIModelFacts[base]; ok {
		return fact, true
	}
	for _, key := range openAIModelFactKeys {
		if strings.HasPrefix(base, key+"-") {
			return openAIModelFacts[key], true
		}
	}
	return openAIModelFact{}, false
}

// openAIToolCount reports whether a request carries tools, which is what decides
// the endpoint for a model whose tool calling Chat Completions does not serve.
func openAIToolsRequireResponses(model string) bool {
	fact, ok := openAIModelFactFor(model)
	return ok && fact.ToolsRequireResponses
}

// openAIModelReasons reports whether the vendor's pages document reasoning token
// support for a model id; an unknown model is not read as a reasoning model.
func openAIModelReasons(model string) bool {
	fact, ok := openAIModelFactFor(model)
	return ok && fact.Reasoning
}

// openAIUsesResponsesEndpoint reports the endpoint a chat request for this model
// takes. The codex catalog always streams from the Responses API, so its caller
// decides that separately.
func openAIUsesResponsesEndpoint(model string, withTools bool) bool {
	fact, ok := openAIModelFactFor(model)
	if !ok {
		return false
	}
	if fact.ChatOnly {
		return false
	}
	if fact.ResponsesOnly {
		return true
	}
	if withTools && fact.ToolsRequireResponses {
		return true
	}
	return fact.Reasoning
}

// openAIReasoningEffort renders a think level as the reasoning_effort literal
// this model accepts. A level the model's page does not name is refused, naming
// the literals it does, so a request never silently asks for a different effort
// than the operator selected. Off is the exception: a model that cannot turn
// reasoning off (its page names no none) carries no effort member at all, which
// is how every chat dialect expresses an inexpressible thinking control.
func openAIReasoningEffort(model string, think *string, declared *modelrepo.ThinkingTypes) (string, error) {
	if think == nil {
		return "", nil
	}
	level, ok, err := reasoning.NormalizeOptional(*think)
	if err != nil {
		return "", err
	}
	if !ok || level == reasoning.Auto {
		return "", nil
	}

	fact, documented := openAIModelFactFor(model)
	if documented {
		if level == reasoning.Off && !slices.Contains(fact.Efforts, reasoningOffLiteral) {
			return "", nil
		}
		if len(fact.Efforts) == 0 {
			return wireEffort(level), nil
		}
		wire := wireEffort(level)
		if !slices.Contains(fact.Efforts, wire) {
			return "", fmt.Errorf("model %s does not support reasoning effort %q (documented: %s)",
				model, level, strings.Join(fact.Efforts, ", "))
		}
		return wire, nil
	}

	if declared != nil {
		if level == reasoning.Off {
			if declared.Disabled {
				return reasoningOffLiteral, nil
			}
			return "", nil
		}
		if len(declared.EffortLevels) > 0 && !declared.SupportsEffort(level) {
			return "", fmt.Errorf("model %s declares no reasoning effort %q (declared: %s)",
				model, level, strings.Join(declared.EffortLevels, ", "))
		}
		return wireEffort(level), nil
	}

	return wireEffort(level), nil
}

// wireEffort is the vendor's literal for a runtime level; off is spelled none.
func wireEffort(level string) string {
	if level == reasoning.Off {
		return reasoningOffLiteral
	}
	return level
}

// openAIShouldOmitSamplingParams reports whether temperature and top_p must be
// left off a reasoning model's request. A reasoning model accepts them only
// while it is not reasoning: with none named among its efforts and no effort
// requested the model's own default is none, and every other reasoning request
// drops them. A reasoning model whose page names no effort literal cannot turn
// reasoning off, and the vendor rejects temperature on it even when no effort
// is sent, so it never carries sampling.
func openAIShouldOmitSamplingParams(model, reasoningEffort string) bool {
	fact, ok := openAIModelFactFor(model)
	if !ok || !fact.Reasoning {
		return false
	}
	if len(fact.Efforts) == 0 {
		return true
	}
	if reasoningEffort == "" {
		return !slices.Contains(fact.Efforts, reasoningOffLiteral)
	}
	return reasoningEffort != reasoningOffLiteral
}

// openAIModelSupportsVision reports whether the vendor's pages list image input
// for a model id; an unknown model declares no vision.
func openAIModelSupportsVision(model string) bool {
	fact, ok := openAIModelFactFor(model)
	return ok && fact.Vision
}

// openAIMaxOutputTokens is the page's output ceiling for a model id, 0 when no
// page states one, which leaves the request unclamped.
func openAIMaxOutputTokens(model string) int {
	fact, ok := openAIModelFactFor(model)
	if !ok {
		return 0
	}
	return fact.MaxOutputTokens
}

// openAIThinkingDeclaration is the thinking controls a request may use: the
// model page's own declaration when the vendor publishes one, otherwise the
// controls the catalogue declared for the model. Neither is inferred from a
// model name, and a declaration naming a level the runtime does not know yields
// none rather than a request the vendor rejects.
func openAIThinkingDeclaration(model string, declared *modelrepo.ThinkingTypes) *modelrepo.ThinkingTypes {
	if documented := openAIThinkingTypes(model); documented != nil {
		return documented
	}
	if declared == nil {
		return nil
	}
	if err := declared.Validate(); err != nil {
		return nil
	}
	return declared
}

// openAIThinkingTypes declares the thinking controls a model's page names, in
// the shared declaration's vocabulary. It returns nil when the page names no
// control the declaration can carry, so an undeclared model is never read as one
// whose controls are known.
func openAIThinkingTypes(model string) *modelrepo.ThinkingTypes {
	fact, ok := openAIModelFactFor(model)
	if !ok || !fact.Reasoning {
		return nil
	}
	declared := &modelrepo.ThinkingTypes{Disabled: slices.Contains(fact.Efforts, reasoningOffLiteral)}
	for _, effort := range fact.Efforts {
		switch effort {
		case reasoning.Low, reasoning.Medium, reasoning.High, reasoning.XHigh, reasoning.Max:
			declared.EffortLevels = append(declared.EffortLevels, effort)
		}
	}
	if err := declared.Validate(); err != nil {
		return nil
	}
	return declared
}
