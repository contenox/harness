import { describe, expect, it, vi } from 'vitest';
import { startAdoptSession, type AdoptIntent, type StartAdoptDeps } from './adoptIntent';

function mockDeps(): StartAdoptDeps & {
  setAdoptIntent: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
} {
  return { setAdoptIntent: vi.fn(), navigate: vi.fn() };
}

const intent: AdoptIntent = { instanceId: 'inst-1', sessionId: 'down-1' };

describe('startAdoptSession', () => {
  it('stages the adopt intent and routes to the chat surface', () => {
    const deps = mockDeps();
    startAdoptSession(intent, deps);

    expect(deps.setAdoptIntent).toHaveBeenCalledTimes(1);
    expect(deps.setAdoptIntent).toHaveBeenCalledWith(intent);
    expect(deps.navigate).toHaveBeenCalledWith('/chat');
  });

  it('stages BEFORE it routes — the chat surface must find the intent already set on arrival', () => {
    const calls: string[] = [];
    const deps: StartAdoptDeps = {
      setAdoptIntent: () => calls.push('stage'),
      navigate: () => calls.push('navigate'),
    };
    startAdoptSession(intent, deps);
    expect(calls).toEqual(['stage', 'navigate']);
  });

  it('does NOT drive the ACP workspace controller (entry points live off the chat page)', () => {
    const deps = mockDeps();
    startAdoptSession(intent, deps);
    expect(Object.keys(deps)).toEqual(['setAdoptIntent', 'navigate']);
  });
});
