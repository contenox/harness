import { describe, expect, it } from 'vitest';
import type { SessionConfigOption } from '@contenox/acp-client';
import { selectRows } from './SessionConfigBar';

function opt(options: unknown): SessionConfigOption {
  return { id: 'model', name: 'Model', type: 'select', currentValue: 'a', options } as SessionConfigOption;
}

describe('selectRows', () => {
  it('keeps flat options as they are', () => {
    expect(selectRows(opt([{ value: 'a', name: 'A' }]))).toEqual([{ value: 'a', label: 'A' }]);
  });

  it('keeps the group name on grouped options', () => {
    const rows = selectRows(
      opt([
        { group: 'g1', name: 'Anthropic', options: [{ value: 'a', name: 'Sonnet' }] },
        { group: 'g2', name: 'Bedrock', options: [{ value: 'b', name: 'Sonnet' }] },
      ]),
    );
    expect(rows).toEqual([
      { value: 'a', label: 'Sonnet', group: 'Anthropic' },
      { value: 'b', label: 'Sonnet', group: 'Bedrock' },
    ]);
  });
});
