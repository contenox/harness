package contenoxcli

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/contenox/harness/libbus"
	"github.com/contenox/harness/libtracker"
	"github.com/contenox/harness/runtime/backendservice"
	"github.com/contenox/harness/runtime/internal/backendapi"
	"github.com/contenox/harness/runtime/internal/providerapi"
	"github.com/contenox/harness/runtime/internal/setupapi"
	"github.com/contenox/harness/runtime/internal/setupcheck"
	internalweb "github.com/contenox/harness/runtime/internal/web"
	"github.com/contenox/harness/runtime/providerservice"
	"github.com/contenox/harness/runtime/runtimestate"
	"github.com/contenox/harness/runtime/serverapi"
	"github.com/contenox/harness/runtime/stateservice"
	"github.com/contenox/harness/runtime/version"
)

const envSetupWebAddr = "CONTENOX_SETUP_WEB_ADDR"

const defaultSetupWebAddr = "127.0.0.1:32124"

func runSetupWeb(ctx context.Context, out io.Writer, openBrowser bool) error {
	dbPath, err := globalDBPath()
	if err != nil {
		return fmt.Errorf("resolve db: %w", err)
	}
	db, err := OpenDBAt(libtracker.WithNewRequestID(ctx), dbPath)
	if err != nil {
		return fmt.Errorf("open database %q: %w", dbPath, err)
	}
	defer db.Close()

	contenoxDir, err := globalContenoxDir()
	if err != nil {
		return fmt.Errorf("resolve contenox dir: %w", err)
	}
	workspaceID := ResolveWorkspaceID(contenoxDir)

	bus := libbus.NewSQLite(db.WithoutTransaction())
	defer bus.Close()
	state, err := runtimestate.New(ctx, db, bus)
	if err != nil {
		return fmt.Errorf("runtime state: %w", err)
	}

	stateSvc := stateservice.New(state, db, workspaceID)
	backendSvc := backendservice.New(db)
	providerSvc := providerservice.New(db, workspaceID)

	apiMux := http.NewServeMux()
	setupapi.AddSetupRoutes(apiMux, stateSvc, nil)
	backendapi.AddStateRoutes(apiMux, stateSvc)
	backendapi.AddBackendRoutes(apiMux, backendSvc, stateSvc)
	providerapi.AddProviderRoutes(apiMux, providerSvc)

	rootMux := http.NewServeMux()
	serverapi.AddHealthRoutes(rootMux)
	serverapi.AddVersionRoutes(rootMux, version.Get(), uuid.NewString()[:8], "local")
	rootMux.Handle("/api/", http.StripPrefix("/api", apiMux))
	rootMux.Handle("/", internalweb.SPAHandler())

	addr := strings.TrimSpace(os.Getenv(envSetupWebAddr))
	if addr == "" {
		addr = defaultSetupWebAddr
	}
	srv := &http.Server{
		Addr:              addr,
		Handler:           rootMux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	url := "http://" + addr
	fmt.Fprintln(out, "")
	fmt.Fprintf(out, "  Contenox setup is running in your browser: %s\n", url)
	fmt.Fprintln(out, "  Complete the wizard there; this command exits when setup is done (Ctrl-C to abort).")
	fmt.Fprintln(out, "")
	if openBrowser {
		openInBrowser(url)
	}

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case err := <-errCh:
			return fmt.Errorf("setup web server: %w", err)
		case <-ticker.C:
			res, err := stateSvc.Refresh(ctx)
			if err != nil {
				continue
			}
			if setupWebComplete(res) {
				fmt.Fprintln(out, "  ✓ Setup complete — you can close the browser tab and reconnect your editor.")
				time.Sleep(2 * time.Second)
				return nil
			}
		}
	}
}

func setupWebComplete(res setupcheck.Result) bool {
	if strings.TrimSpace(res.DefaultModel) == "" {
		return false
	}
	if res.ReachableBackendCount <= 0 {
		return false
	}
	for _, issue := range res.Issues {
		if issue.Severity == "error" {
			return false
		}
	}
	return true
}

func openInBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}
