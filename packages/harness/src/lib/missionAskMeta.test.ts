import { describe, expect, it } from 'vitest';
import { MISSION_ASK_META_KEY, missionAskFromMeta } from './acp';

describe('missionAskFromMeta', () => {
  it('reads a delivered question, trimming the handle', () => {
    const ask = missionAskFromMeta({
      [MISSION_ASK_META_KEY]: {
        askId: ' ask-1 ',
        missionId: 'm-1',
        agentName: 'chain-acp',
        summary: 'which project?',
        detail: 'the intent named none',
      },
    });
    expect(ask).toEqual({
      askId: 'ask-1',
      missionId: 'm-1',
      agentName: 'chain-acp',
      intent: undefined,
      summary: 'which project?',
      detail: 'the intent named none',
    });
  });

  it('is null for an ordinary message', () => {
    expect(missionAskFromMeta(undefined)).toBeNull();
    expect(missionAskFromMeta({})).toBeNull();
    expect(missionAskFromMeta({ 'contenox.missionReport': { missionId: 'm-1' } })).toBeNull();
  });

  it('refuses a question with no handle or no text — there would be nothing to answer', () => {
    expect(missionAskFromMeta({ [MISSION_ASK_META_KEY]: { summary: 'no id' } })).toBeNull();
    expect(
      missionAskFromMeta({ [MISSION_ASK_META_KEY]: { askId: 'a', summary: '  ' } }),
    ).toBeNull();
    expect(missionAskFromMeta({ [MISSION_ASK_META_KEY]: 'not an object' })).toBeNull();
  });
});
