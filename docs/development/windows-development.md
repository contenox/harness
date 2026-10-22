# Windows Development

This guide covers working on Contenox when your daily driver is Windows.

The codebase is primarily developed on Linux. Windows support exists for the
pure-Go `contenox` CLI, the runtime packages, and building the Beam UI.

## Recommended paths

| Path | Best for |
|------|----------|
| **WSL2 (Ubuntu/Debian recommended)** | Day-to-day Go development, CLI work, running tests, UI/Beam packaging |
| **Native Windows (PowerShell/cmd + Git Bash)** | Verifying Windows-specific behavior: paths, `local_shell`, PowerShell/cmd.exe execution |
| **Remote SSH** | Offloading heavy work (gopls, builds) to a Linux box while editing on Windows |

For most contributors: install WSL2 and do the normal Linux flow inside it (see
[CONTRIBUTING.md](../../CONTRIBUTING.md)). Drop to a native Windows checkout when
you need Windows-specific verification.

## WSL2 setup (fast path)

1. Enable WSL2 and install a distro (Ubuntu 22.04/24.04 works well).
2. Inside WSL, follow the Linux prerequisites and build instructions from `CONTRIBUTING.md`.
3. Your Windows files are at `/mnt/c/...`. Clone the repo inside WSL for best performance on Go modules and builds.

## Native Windows prerequisites

- **Git for Windows** (brings Git Bash). Configure `core.autocrlf=input` (or `false`) to keep the repo LF-only:

  ```powershell
  git config --global core.autocrlf input
  ```

- Go 1.25+ (official MSI).
- Node.js 22+ for `packages/ui` and `packages/beam`.
- Make is helpful but not required. Either install it (`choco install make`) or invoke the individual `go build` / `npm` commands.

## Building and testing on Windows

Build the pure-Go CLI:

```powershell
go build -o bin\contenox.exe .\cmd\contenox
```

Or use the cross target (works from any OS):

```bash
make build-contenox-windows
```

- Unit tests: `go test -short ./...` (or `make test-unit` if make is present).
- Many system tests assume Unix shells; expect differences in `local_shell`, path handling, and process execution. Run real Windows verification with `cmd.exe` / PowerShell.
- The Beam UI builds with `npm ci && npm run build` in `packages/ui`, then `packages/beam`.

## Common Windows gotchas

- **Shell execution**: `local_shell` and similar tools behave differently under `cmd.exe` vs PowerShell vs Git Bash. Test real Windows scenarios.
- **Paths**: Forward and backslashes are usually tolerated; be careful with code that shells out.
- **Line endings**: The repository uses LF. Let Git handle conversion on checkout.
- **Case sensitivity**: Windows is case-preserving but not sensitive; avoid relying on case-only differences in filenames.
- **Antivirus / real-time protection**: Can interfere with large builds or many small files during `go build`.

## See also

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — main local development instructions
