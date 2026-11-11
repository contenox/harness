import { describe, expect, it } from 'vitest';
import { shellOutputLines } from './shellExecution';

describe('shellOutputLines', () => {
  it('turns a structured shell result into stdout and stderr lines', () => {
    const lines = shellOutputLines({
      exit_code: 0,
      stdout: 'ok  \tgithub.com/google/uuid\t(cached)\n',
      stderr: '',
      success: true,
      duration_seconds: 1.9,
      command: 'go',
      shell: 'PowerShell',
      os: 'windows',
    });
    expect(lines).toEqual(['ok  \tgithub.com/google/uuid\t(cached)']);
  });

  it('appends a non-zero exit code after stderr', () => {
    const lines = shellOutputLines(
      JSON.stringify({
        exit_code: 1,
        stdout: 'FAIL\tpkg [build failed]',
        stderr: '# pkg\nx.go:3: redeclared',
      }),
    );
    expect(lines).toEqual(['FAIL\tpkg [build failed]', '# pkg', 'x.go:3: redeclared', 'exit 1']);
  });

  it('shows the exit code when a run produced no output', () => {
    expect(shellOutputLines({ exit_code: 0, stdout: '', stderr: '' })).toEqual(['exit 0']);
  });

  it('keeps plain text output as lines', () => {
    expect(shellOutputLines('a\nb')).toEqual(['a', 'b']);
    expect(shellOutputLines(42)).toBeNull();
  });
});
