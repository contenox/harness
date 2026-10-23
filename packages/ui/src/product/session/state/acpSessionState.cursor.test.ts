import { describe, expect, it } from 'vitest';
import { acpSessionReducer, initialAcpSessionState } from './acpSessionState';

describe('event_seq resume cursor', () => {
  it('advances monotonically, ignores stale sequences, and resets with the session', () => {
    let state = initialAcpSessionState;
    expect(state.lastSeq).toBe(0);

    state = acpSessionReducer(state, { type: 'event_seq', seq: 3 });
    expect(state.lastSeq).toBe(3);


    state = acpSessionReducer(state, { type: 'event_seq', seq: 2 });
    expect(state.lastSeq).toBe(3);

    state = acpSessionReducer(state, { type: 'session_reset', sessionId: 'fresh' });
    expect(state.lastSeq).toBe(0);
  });
});
