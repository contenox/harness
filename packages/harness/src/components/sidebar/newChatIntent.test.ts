import { describe, expect, it, vi } from 'vitest';
import { startNewChat, type NewChatDeps } from './newChatIntent';

function mockDeps(): NewChatDeps & {
  setStagedAgent: ReturnType<typeof vi.fn>;
  setStagedRoot: ReturnType<typeof vi.fn>;
  focusEmptyTab: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
  closeSidebar: ReturnType<typeof vi.fn>;
} {
  return {
    setStagedAgent: vi.fn(),
    setStagedRoot: vi.fn(),
    focusEmptyTab: vi.fn(),
    navigate: vi.fn(),
    closeSidebar: vi.fn(),
  };
}

describe('startNewChat', () => {
  it('picking an agent stages that agent AND focuses the empty /chat surface (from a session tab)', () => {
    const deps = mockDeps();
    startNewChat('claude', deps);

    expect(deps.setStagedAgent).toHaveBeenCalledTimes(1);
    expect(deps.setStagedAgent).toHaveBeenCalledWith('claude');
    expect(deps.focusEmptyTab).toHaveBeenCalledTimes(1);
    expect(deps.navigate).toHaveBeenCalledWith('/chat');
    expect(deps.closeSidebar).toHaveBeenCalledTimes(1);
  });

  it('stages, then focuses the empty surface, then routes — order-fixed so the sync agrees with the route', () => {
    const calls: string[] = [];
    const deps: NewChatDeps = {
      setStagedAgent: () => calls.push('stage'),
      setStagedRoot: () => calls.push('stageRoot'),
      focusEmptyTab: () => calls.push('focusEmptyTab'),
      navigate: () => calls.push('navigate'),
      closeSidebar: () => calls.push('close'),
    };
    startNewChat('claude', deps);
    expect(calls).toEqual(['stage', 'stageRoot', 'focusEmptyTab', 'navigate', 'close']);
  });

  it('a launcher stages its project cwd; a non-launcher path clears the context stage', () => {
    const launcher = mockDeps();
    startNewChat(null, launcher, { cwd: '/home/me/api' });
    expect(launcher.setStagedRoot).toHaveBeenCalledWith('/home/me/api');

    const plain = mockDeps();
    startNewChat(null, plain);
    expect(plain.setStagedRoot).toHaveBeenCalledWith(null);
  });

  it('is a no-op-safe call when a caller omits setStagedRoot (isolated test / older caller)', () => {
    const { setStagedRoot: _omit, ...rest } = mockDeps();
    expect(() => startNewChat(null, rest)).not.toThrow();
    expect(rest.focusEmptyTab).toHaveBeenCalledTimes(1);
  });

  it('picking while already on the empty surface still updates the staged agent (navigate is a no-op there)', () => {
    const deps = mockDeps();

    startNewChat('claude', deps);
    startNewChat('gpt-4o', deps);

    expect(deps.setStagedAgent).toHaveBeenNthCalledWith(1, 'claude');
    expect(deps.setStagedAgent).toHaveBeenNthCalledWith(2, 'gpt-4o');
    expect(deps.setStagedAgent).toHaveBeenCalledTimes(2);
    expect(deps.focusEmptyTab).toHaveBeenCalledTimes(2);
    expect(deps.navigate).toHaveBeenCalledTimes(2);
  });

  it('picking the native "Contenox (default)" entry clears staging (null)', () => {
    const deps = mockDeps();
    startNewChat(null, deps);

    expect(deps.setStagedAgent).toHaveBeenCalledWith(null);
    expect(deps.focusEmptyTab).toHaveBeenCalledTimes(1);
    expect(deps.navigate).toHaveBeenCalledWith('/chat');
  });

  it('the plain "New session" button and native pick are the SAME call — one code path', () => {
    const plainButton = mockDeps();
    const nativePick = mockDeps();

    startNewChat(null, plainButton);
    startNewChat(null, nativePick);

    expect(plainButton.setStagedAgent.mock.calls).toEqual(nativePick.setStagedAgent.mock.calls);
    expect(plainButton.focusEmptyTab.mock.calls).toEqual(nativePick.focusEmptyTab.mock.calls);
    expect(plainButton.navigate.mock.calls).toEqual(nativePick.navigate.mock.calls);
  });
});
