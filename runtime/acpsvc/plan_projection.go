package acpsvc

import (
	"encoding/json"

	"github.com/contenox/harness/libacp"
	"github.com/contenox/harness/runtime/missionservice"
	"github.com/contenox/harness/runtime/missiontools"
	"github.com/contenox/harness/runtime/taskengine"
)

const planToolEventName = missiontools.ToolsProviderName + "." + missiontools.ToolNamePlan

func planUpdateNotification(sid libacp.SessionID, ev taskengine.TaskEvent) (libacp.SessionNotification, bool) {
	if ev.ToolName != planToolEventName || ev.Error != "" {
		return libacp.SessionNotification{}, false
	}
	if ev.Content == "" {
		return libacp.SessionNotification{}, false
	}
	var plan missionservice.Plan
	if err := json.Unmarshal([]byte(ev.Content), &plan); err != nil {
		return libacp.SessionNotification{}, false
	}
	if len(plan.Entries) == 0 {
		return libacp.SessionNotification{}, false
	}
	entries := make([]libacp.PlanEntry, 0, len(plan.Entries))
	for _, e := range plan.Entries {
		entries = append(entries, libacp.PlanEntry{
			Content:  e.Content,
			Priority: libacp.PlanEntryPriority(e.Priority),
			Status:   libacp.PlanEntryStatus(e.Status),
		})
	}
	return libacp.SessionNotification{
		SessionID: sid,
		Update: libacp.SessionUpdate{
			SessionUpdate: libacp.SessionUpdatePlan,
			Entries:       entries,
		},
	}, true
}
