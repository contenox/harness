// Package acpexec spawns a subprocess and wires its stdin/stdout together as a
// single io.ReadWriteCloser, the transport shape libacp's connections expect.
package acpexec

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"sync/atomic"
	"time"
)

const defaultKillGrace = 5 * time.Second

// Option configures Spawn. See WithStderr and WithKillGrace.
type Option func(*config)

type config struct {
	stderr    io.Writer
	killGrace time.Duration
}

// WithStderr forwards the subprocess's stderr to w as it's written, instead
// of the default (io.Discard); use a *LockedBuffer if the caller reads w's
// contents from a different goroutine than the one writing it.
func WithStderr(w io.Writer) Option {
	return func(c *config) { c.stderr = w }
}

// WithKillGrace overrides how long Close waits for the subprocess to exit on
// its own (after closing its stdin) before it escalates to Process.Kill; the
// default is 5 seconds.
func WithKillGrace(d time.Duration) Option {
	return func(c *config) { c.killGrace = d }
}

// Process is a spawned subprocess wired up as an io.ReadWriteCloser: Read pulls
// from its stdout, Write pushes to its stdin, Close begins shutdown.
type Process struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
	grace  time.Duration

	waitDone chan struct{}
	waitErr  error

	stdoutClosed atomic.Bool
	closeOnce    sync.Once
	closeErr     error
}

var _ io.ReadWriteCloser = (*Process)(nil)

// Spawn starts cmd, claiming its Stdin and Stdout, which callers must leave
// unset. It owns the process group so Close can kill descendants holding the
// pipes open. It tears the process down exactly as Close would if ctx is
// cancelled before the subprocess exits.
func Spawn(ctx context.Context, cmd *exec.Cmd, opts ...Option) (*Process, error) {
	cfg := config{stderr: io.Discard, killGrace: defaultKillGrace}
	for _, opt := range opts {
		opt(&cfg)
	}

	if cmd.Stdout != nil {
		return nil, fmt.Errorf("acpexec: stdout pipe: exec: Stdout already set")
	}
	stdout, childStdout, err := os.Pipe()
	if err != nil {
		return nil, fmt.Errorf("acpexec: stdout pipe: %w", err)
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		_ = stdout.Close()
		_ = childStdout.Close()
		return nil, fmt.Errorf("acpexec: stdin pipe: %w", err)
	}
	cmd.Stdout = childStdout
	cmd.Stderr = cfg.stderr

	setProcessGroup(cmd)

	if err := cmd.Start(); err != nil {
		_ = stdin.Close()
		_ = stdout.Close()
		_ = childStdout.Close()
		return nil, fmt.Errorf("acpexec: start %s: %w", cmd.Path, err)
	}

	p := &Process{
		cmd:      cmd,
		stdin:    stdin,
		stdout:   stdout,
		grace:    cfg.killGrace,
		waitDone: make(chan struct{}),
	}

	go func() {
		p.waitErr = cmd.Wait()
		close(p.waitDone)
	}()

	if err := childStdout.Close(); err != nil {
		return nil, errors.Join(fmt.Errorf("acpexec: close parent stdout writer: %w", err), p.Close())
	}

	if ctx != nil {
		go func() {
			select {
			case <-ctx.Done():
				_ = p.Close()
			case <-p.waitDone:
			}
		}()
	}

	return p, nil
}

// Read reads from the subprocess's stdout, returning io.EOF like any closed
// pipe once the subprocess exits (on its own, or via Close/ctx cancellation).
// Natural exit preserves remaining stdout until Read drains it or Close is called.
func (p *Process) Read(b []byte) (int, error) {
	n, err := p.stdout.Read(b)
	if errors.Is(err, os.ErrClosed) && p.stdoutClosed.Load() {
		return n, io.EOF
	}
	return n, err
}

// Write writes to the subprocess's stdin.
func (p *Process) Write(b []byte) (int, error) { return p.stdin.Write(b) }

const killReapTimeout = 5 * time.Second

// Close closes stdin, waits for exit, and closes stdout. It kills the process
// group if the grace period elapses and suppresses only that kill's exit status.
// Repeated calls return the same result.
func (p *Process) Close() error {
	p.closeOnce.Do(func() {
		_ = p.stdin.Close()

		killed := false
		select {
		case <-p.waitDone:
		case <-time.After(p.grace):
			killed = true
			killProcessTree(p.cmd)
			select {
			case <-p.waitDone:
			case <-time.After(killReapTimeout):
				p.closeStdout()
				p.closeErr = fmt.Errorf("acpexec: subprocess %s not reaped %s after kill (a descendant outside its process group may be holding its pipes)", p.cmd.Path, killReapTimeout)
				return
			}
		}

		p.closeStdout()
		p.closeErr = p.waitErr

		if killed && exitFromKill(p.waitErr) {
			p.closeErr = nil
		}
	})
	return p.closeErr
}

func (p *Process) closeStdout() {
	p.stdoutClosed.Store(true)
	_ = p.stdout.Close()
}

// LockedBuffer is a concurrency-safe io.Writer around a bytes.Buffer, for use
// with WithStderr when a caller's String() read races the subprocess reader
// goroutine's writes.
type LockedBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *LockedBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

// String returns everything written so far.
func (b *LockedBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}
