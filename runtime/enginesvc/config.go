package enginesvc

import (
	"context"

	"github.com/contenox/harness/libbus"
	"github.com/contenox/harness/libkvstore"
	"github.com/contenox/harness/libtracker"
	"github.com/contenox/harness/runtime/execservice"
	"github.com/contenox/harness/runtime/hitlservice"
	"github.com/contenox/harness/runtime/internal/setupcheck"
	"github.com/contenox/harness/runtime/localtools"
	"github.com/contenox/harness/runtime/mcpworker"
	"github.com/contenox/harness/runtime/runtimestate"
	"github.com/contenox/harness/runtime/taskengine"
)

type Config struct {
	DefaultModel       string
	DefaultProvider    string
	AltDefaultModel    string
	AltDefaultProvider string

	ReadinessDefaultModel    string
	ReadinessDefaultProvider string

	ContextLength int

	NoDeleteModels bool

	LocalTools map[string]taskengine.ToolsRepo

	EnableHITL            bool
	AskApproval           localtools.AskApproval
	HITLService           hitlservice.Service
	HITLDefaultPolicyName string

	Bus             libbus.Messenger
	KVStore         libkvstore.KVManager
	State           *runtimestate.State
	Tracker         libtracker.ActivityTracker
	ExtraInspectors []func(taskengine.Inspector) taskengine.Inspector
	TaskEventSink   taskengine.TaskEventSink

	Tracing bool

	SkipBackendCycle bool

	WorkspaceID      string
	TenantID         string
	HITLPolicySource hitlservice.PolicySource
}

type Engine struct {
	TaskService   execservice.TasksEnvService
	Tracker       libtracker.ActivityTracker
	Bus           libbus.Messenger
	State         *runtimestate.State
	MCPManager    *mcpworker.Manager
	LocalTools    []string
	SetupCheck    setupcheck.Result
	TaskEventSink taskengine.TaskEventSink
	Stop          func()
	SetupStatus   func(ctx context.Context) (setupcheck.Result, error)
}
