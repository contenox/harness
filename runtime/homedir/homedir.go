// Package homedir names the per-user Contenox Harness directory.
//
// The directory is deliberately not ".contenox": installs from earlier product
// shapes keep their database, configuration and chain files there, and sharing
// that state across versions with different schemas produces exactly the kind
// of silent corruption an operator cannot diagnose. A harness install starts
// from its own directory.
package homedir

import (
	"fmt"
	"os"
	"path/filepath"
)

// DirName is the per-user directory name under $HOME.
const DirName = ".contenox-harness"

// Dir returns $HOME/.contenox-harness-harness, creating it with 0700 when missing.
func Dir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("cannot determine home directory: %w", err)
	}
	dir := filepath.Join(home, DirName)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("create %s: %w", dir, err)
	}
	return dir, nil
}

// Join returns Dir() joined with elem.
func Join(elem ...string) (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(append([]string{dir}, elem...)...), nil
}
