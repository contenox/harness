import { describe, expect, it } from 'vitest';
import { describePersistedFailures, isPersistedFailure } from './persistedFailure';

const route =
  '[step "chain-acp-route" (route) failed: task chain-acp-route: route task chain-acp-route: prompt execution failed: Bedrock model x is not enabled for this AWS account. Enable it under Model access in the Bedrock console.]';

describe('persisted failures', () => {
  it('recognises step and chain failure annotations only', () => {
    expect(isPersistedFailure(route)).toBe(true);
    expect(isPersistedFailure('[chain failed: boom]')).toBe(true);
    expect(isPersistedFailure('[step "a" (b) timed out]')).toBe(true);
    expect(isPersistedFailure('Hello [step "a" (b) failed: x]')).toBe(false);
    expect(isPersistedFailure('plain answer')).toBe(false);
  });

  it('keeps the reason as the summary and every raw line as details', () => {
    const result = describePersistedFailures([route, '[chain failed: other]']);
    expect(result.summary).toBe(
      'Bedrock model x is not enabled for this AWS account. Enable it under Model access in the Bedrock console.',
    );
    expect(result.summary).not.toContain('chain-acp-route');
    expect(result.details).toContain('chain-acp-route');
    expect(result.details).toContain('[chain failed: other]');
  });
});
