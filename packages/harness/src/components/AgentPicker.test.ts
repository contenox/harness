import { describe, expect, it } from 'vitest';
import { AGENT_PICKER_CONTENT_CLASSNAME } from './AgentPicker';

describe('AGENT_PICKER_CONTENT_CLASSNAME', () => {
  it('right-anchors so the panel never escapes the right/viewport edge', () => {
    expect(AGENT_PICKER_CONTENT_CLASSNAME).toContain('right-0');
    expect(AGENT_PICKER_CONTENT_CLASSNAME).toContain('left-auto');
  });

  it('drops the unbounded `w-max` that grew leftward past the rail clip bounds', () => {
    expect(AGENT_PICKER_CONTENT_CLASSNAME).not.toContain('w-max');
  });

  it('caps width to the viewport so it stays within narrow / mobile widths', () => {
    expect(AGENT_PICKER_CONTENT_CLASSNAME).toMatch(/calc\(100vw-[0-9.]+rem\)/);
  });

  it('scrolls long content inside the panel instead of overflowing its box', () => {
    expect(AGENT_PICKER_CONTENT_CLASSNAME).toContain('overflow-auto');
    expect(AGENT_PICKER_CONTENT_CLASSNAME).toMatch(/max-h-/);
  });
});
