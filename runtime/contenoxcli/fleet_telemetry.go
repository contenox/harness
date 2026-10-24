package contenoxcli

import (
	"context"

	"github.com/contenox/harness/libtracker"
	"github.com/contenox/harness/runtime/agentinstance"
)

func newInstanceEventSink(tracker libtracker.ActivityTracker) agentinstance.EventSink {
	return func(ev agentinstance.Event) {
		_, reportChange, end := tracker.Start(
			context.Background(),
			string(ev.Kind), "agent_instance",
			"instance_id", ev.InstanceID,
			"agent_id", ev.AgentID,
			"agent_name", ev.AgentName,
		)
		reportChange(ev.InstanceID, ev)
		end()
	}
}
