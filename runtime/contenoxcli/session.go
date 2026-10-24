package contenoxcli

import (
	"context"

	libdb "github.com/contenox/harness/libdbexec"
	"github.com/contenox/harness/libtracker"
	"github.com/contenox/harness/runtime/sessionservice"
)

const localIdentity = "local-user"

func ensureDefaultSession(ctx context.Context, db libdb.DBManager, workspaceID string) (string, error) {
	return sessionservice.New(db, workspaceID, libtracker.NoopTracker{}).EnsureDefault(ctx, localIdentity)
}
