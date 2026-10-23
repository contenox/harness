package modelrepo

type chatArgument struct {
	applyFunc func(*ChatConfig)
}

func (c *chatArgument) Apply(config *ChatConfig) {
	c.applyFunc(config)
}

func WithTemperature(temp float64) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			config.Temperature = &temp
		},
	}
}

func WithMaxTokens(tokens int) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			config.MaxTokens = &tokens
		},
	}
}

func WithTopP(p float64) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			config.TopP = &p
		},
	}
}

func WithSeed(seed int) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			config.Seed = &seed
		},
	}
}

func WithTool(tool Tool) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			config.Tools = append(config.Tools, tool)
		},
	}
}

func WithTools(tools ...Tool) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			config.Tools = append(config.Tools, tools...)
		},
	}
}

// WithCacheHints declares the request's stable/volatile boundary for
// provider-side prompt caching (see CacheHints). The hints are copied so the
// caller's value cannot be mutated through the config afterwards.
func WithCacheHints(hints CacheHints) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			h := hints
			config.CacheHints = &h
		},
	}
}

// WithStopSequences bounds generation at the provider; the sequences are
// copied, and more than MaxStopSequences are refused at request build time.
func WithStopSequences(sequences ...string) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			config.StopSequences = append([]string(nil), sequences...)
		},
	}
}

// WithToolChoice selects which tool the model may call.
func WithToolChoice(choice ToolChoice) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			c := choice
			config.ToolChoice = &c
		},
	}
}

// WithParallelToolCalls controls whether one turn may contain several tool calls.
func WithParallelToolCalls(enabled bool) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			config.ParallelToolCalls = &enabled
		},
	}
}

// WithResponseFormat constrains the response to a JSON shape; the format is
// copied so the caller's value cannot be mutated through the config afterwards.
func WithResponseFormat(format ResponseFormat) ChatArgument {
	return &chatArgument{
		applyFunc: func(config *ChatConfig) {
			f := format
			config.Format = &f
		},
	}
}
