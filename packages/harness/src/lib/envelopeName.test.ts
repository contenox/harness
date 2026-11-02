import { describe, expect, it } from 'vitest';
import { envelopeDisplayName } from './envelopeName';

describe('envelopeDisplayName', () => {
  it('leaves a plain envelope or policy name as it is', () => {
    expect(envelopeDisplayName('strict')).toBe('strict');
    expect(envelopeDisplayName('hitl-policy-strict.json')).toBe('hitl-policy-strict.json');
  });

  it('drops the workspace folder a workspace envelope is stored under', () => {
    expect(envelopeDisplayName('workspaces/6f1c/hitl-policy-review_only.json')).toBe('hitl-policy-review_only.json');
    expect(envelopeDisplayName('  workspaces\\6f1c\\hitl-policy-dev.json ')).toBe('hitl-policy-dev.json');
  });
});
