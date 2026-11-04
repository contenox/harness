import { describe, expect, it } from 'vitest';
import { emptyAgentForm, formFromAgent, inputFromForm, parseEnv, validateAgentForm } from './externalAgentForm';

describe('externalAgentForm', () => {
  it('turns the text fields into the runtime shape', () => {
    const input = inputFromForm({
      name: ' my-agent ',
      command: ' goose ',
      args: 'acp\n\n  --verbose  ',
      env: 'GOOSE_PROVIDER=anthropic\nA=b=c',
      modes: 'ask, plan  edit',
      paths: [
        { path: ' ~/.config/goose ', mode: 'rw', needs: ' its sign-in ' },
        { path: '  ', mode: 'ro', needs: '' },
      ],
    });
    expect(input).toEqual({
      name: 'my-agent',
      enabled: undefined,
      command: 'goose',
      args: ['acp', '--verbose'],
      env: { GOOSE_PROVIDER: 'anthropic', A: 'b=c' },
      modes: ['ask', 'plan', 'edit'],
      paths: [{ path: '~/.config/goose', mode: 'rw', needs: 'its sign-in' }],
      mcpServers: [],
    });
  });

  it('round-trips an agent through the form', () => {
    const values = formFromAgent({
      id: 'x',
      name: 'goose',
      title: 'goose',
      enabled: true,
      command: 'goose',
      args: ['acp'],
      env: { K: 'v' },
      paths: [{ path: '~/.g', mode: 'rw', needs: 'n' }],
      modes: ['ask'],
      mcpServers: [],
      sandbox: { readsLimited: false },
      createdAt: '',
      updatedAt: '',
    });
    expect(inputFromForm(values).env).toEqual({ K: 'v' });
    expect(values.args).toBe('acp');
  });

  it('flags env lines without a name', () => {
    expect(parseEnv('=x\nOK=1\nnope').bad).toEqual(['=x', 'nope']);
  });

  it('validates name, command, env and path reasons', () => {
    expect(validateAgentForm(emptyAgentForm, [], false)).toEqual({
      name: 'external_agents.form.name_invalid',
      command: 'external_agents.form.command_required',
    });
    expect(validateAgentForm({ ...emptyAgentForm, name: 'taken', command: 'x' }, ['taken'], false).name).toBe(
      'external_agents.form.name_taken',
    );
    expect(validateAgentForm({ ...emptyAgentForm, name: 'Bad Name', command: 'x' }, [], true).name).toBeUndefined();
    expect(
      validateAgentForm({ ...emptyAgentForm, name: 'a', command: 'x', paths: [{ path: '~/x', mode: 'rw', needs: '' }] }, [], false)
        .paths,
    ).toBe('external_agents.form.path_needs_reason');
  });
});
