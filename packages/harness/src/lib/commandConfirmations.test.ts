import { describe, expect, it } from 'vitest';
import { translateCommandConfirmation } from './commandConfirmations';

const t = ((key: string, values?: Record<string, string>) => `${key}:${values?.level ?? ''}`) as never;

describe('translateCommandConfirmation', () => {
  it('maps the think confirmations to keys', () => {
    expect(translateCommandConfirmation('Think set to auto for this session.', t)).toBe(
      'acp_chat.command_think_set:auto',
    );
    expect(translateCommandConfirmation('Think: high', t)).toBe('acp_chat.command_think_current:high');
  });

  it('leaves other text alone', () => {
    expect(translateCommandConfirmation('Hello there', t)).toBe('Hello there');
  });
});
