package libacp_test

import (
	"slices"
	"strings"
	"testing"

	libacp "github.com/contenox/harness/libacp"
)

// acpSessionUpdateKinds is the ACP `sessionUpdate` union as the reference
// schema declares it: every member is a literal, so a kind outside this set is
// refused by a conforming client before any handler runs, and a payload stamped
// under one is unreachable rather than merely unrecognized.
//
// The list is a restatement of another project's schema, which is why it is
// pinned here rather than derived: the schema is not in this module, and the
// alternative is a package that discovers the refusal from a user.
var acpSessionUpdateKinds = []string{
	"agent_message_chunk",
	"agent_thought_chunk",
	"available_commands_update",
	"compaction_summary_chunk",
	"compaction_update",
	"config_option_update",
	"current_mode_update",
	"notice",
	"plan",
	"plan_removed",
	"plan_update",
	"session_info_update",
	"session_message",
	"session_message_chunk",
	"subagent_update",
	"tool_call",
	"tool_call_update",
	"usage_update",
	"user_message_chunk",
}

// undeclaredSessionUpdateKinds names the kinds this library carries that the ACP
// schema does not declare, with the reason each stays. An entry is a deliberate
// exception, not a hiding place: it is the list a reader checks when a client
// refuses an update, and a kind that is not here has to be ACP's.
var undeclaredSessionUpdateKinds = map[string]string{
	"usage_stats": "the session-level usage record: the runtime's own session accounting, sent to a surface that asked this runtime for it. ACP declares usage_update, which carries a context gauge rather than the runtime's per-session record, so the two are not the same fact; a shell reading this kind is reading the runtime's own vocabulary.",
}

// TestUnit_SessionUpdateKinds_AreACPDeclaredKinds refuses an update kind this
// library invents. The transport carries whatever kind it is given, so a kind
// outside the union looks like it works from inside the runtime and is refused
// by every client that validates the schema — which is what happened to shell
// output, sent for a while as an invented kind that no conforming client could
// read. A stream that needs its own envelope belongs on the extension
// notification channel, not in the session update vocabulary.
func TestUnit_SessionUpdateKinds_AreACPDeclaredKinds(t *testing.T) {
	var invented []string
	for _, kind := range libacp.AllSessionUpdateKinds() {
		if slices.Contains(acpSessionUpdateKinds, string(kind)) {
			continue
		}
		if _, named := undeclaredSessionUpdateKinds[string(kind)]; named {
			continue
		}
		invented = append(invented, string(kind))
	}
	if len(invented) > 0 {
		t.Fatalf("session update kinds the ACP schema does not declare, which a conforming client refuses before any handler runs: %v", invented)
	}
	for kind, reason := range undeclaredSessionUpdateKinds {
		if !slices.ContainsFunc(libacp.AllSessionUpdateKinds(), func(candidate libacp.SessionUpdateKind) bool {
			return string(candidate) == kind
		}) {
			t.Fatalf("session update kind %s is named as a deliberate exception and the library no longer declares it", kind)
		}
		if strings.TrimSpace(reason) == "" {
			t.Fatalf("session update kind %s is named as a deliberate exception without a reason", kind)
		}
	}
}
