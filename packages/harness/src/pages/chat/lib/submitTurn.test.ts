import { describe, expect, it, vi } from 'vitest';
import { submitChatTurn, type SubmitPayload, type SubmitTurnDeps } from './submitTurn';

function deps(over: Partial<SubmitTurnDeps> = {}): SubmitTurnDeps {
  return {
    sessionId: null,
    workspaceRoot: 'C:/work/proj',
    stagedExternalAgent: null,
    stagedConfig: {},
    newSession: vi.fn(async () => 'new-sid'),
    applyConfigOptions: vi.fn(async () => {}),
    sendPrompt: vi.fn(),
    runTerminal: vi.fn(async () => {}),
    openTerminal: vi.fn(),
    clearStagedAgent: vi.fn(),
    onSessionCreated: vi.fn(),
    ...over,
  };
}

const prompt = (over: Partial<Extract<SubmitPayload, { kind: 'prompt' }>> = {}): SubmitPayload => ({
  kind: 'prompt',
  text: 'hi',
  mentions: [],
  images: [],
  takeAudio: () => [],
  ...over,
});

describe('submitChatTurn: session cwd', () => {
  it('starts the session in the resolved workspace root, never "/"', async () => {
    const d = deps();
    await submitChatTurn(d, prompt());
    expect(d.newSession).toHaveBeenCalledWith('C:/work/proj', null);
    expect(vi.mocked(d.newSession).mock.calls[0][0]).not.toBe('/');
  });

  it('passes undefined (not "/") when no root could be resolved', async () => {
    const d = deps({ workspaceRoot: null });
    await submitChatTurn(d, prompt());
    expect(vi.mocked(d.newSession).mock.calls[0][0]).toBeUndefined();
  });

  it('uses the same root for the shell passthrough path', async () => {
    const d = deps();
    await submitChatTurn(d, { kind: 'shell', command: 'ls' });
    expect(d.newSession).toHaveBeenCalledWith('C:/work/proj', null);
    expect(d.openTerminal).toHaveBeenCalled();
    expect(d.runTerminal).toHaveBeenCalledWith('ls');
  });
});

describe('submitChatTurn: orchestration', () => {
  it('reuses an existing session and does not create a new one', async () => {
    const d = deps({ sessionId: 's1' });
    await submitChatTurn(d, prompt());
    expect(d.newSession).not.toHaveBeenCalled();
    expect(d.onSessionCreated).not.toHaveBeenCalled();
    expect(d.sendPrompt).toHaveBeenCalledWith('hi', [], [], []);
  });

  it('applies staged config (minus the workspace root) before the first prompt', async () => {
    const d = deps({ stagedConfig: { 'workspace-root': 'C:/x', model: 'm1' } });
    await submitChatTurn(d, prompt());
    expect(d.applyConfigOptions).toHaveBeenCalledWith([{ configId: 'model', value: 'm1' }]);
    expect(d.onSessionCreated).toHaveBeenCalledWith('new-sid');
    expect(d.sendPrompt).toHaveBeenCalled();
  });

  it('skips staged config for an external agent and clears the staged agent', async () => {
    const d = deps({ stagedExternalAgent: 'claude', stagedConfig: { model: 'm1' } });
    await submitChatTurn(d, prompt());
    expect(d.newSession).toHaveBeenCalledWith('C:/work/proj', 'claude');
    expect(d.applyConfigOptions).not.toHaveBeenCalled();
    expect(d.clearStagedAgent).toHaveBeenCalled();
  });

  it('rejects without sending when the session cannot be created, leaving audio untouched', async () => {
    const takeAudio = vi.fn(() => []);
    const d = deps({ newSession: vi.fn(async () => Promise.reject(new Error('boom'))) });
    await expect(submitChatTurn(d, prompt({ takeAudio }))).rejects.toThrow('boom');
    expect(d.sendPrompt).not.toHaveBeenCalled();
    expect(takeAudio).not.toHaveBeenCalled();
  });

  it('rejects when applying staged config fails', async () => {
    const d = deps({
      stagedConfig: { model: 'm1' },
      applyConfigOptions: vi.fn(async () => Promise.reject(new Error('nope'))),
    });
    await expect(submitChatTurn(d, prompt())).rejects.toThrow('nope');
    expect(d.sendPrompt).not.toHaveBeenCalled();
  });
});
