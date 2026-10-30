import { describe, expect, it } from 'vitest';
import {
  COMMAND_MODEL,
  COMMAND_POLICY,
  COMMAND_PROVIDER,
  COMMAND_THINK,
  commandValueDomains,
} from './commandValueDomains';
import type { SessionConfigOption } from '@contenox/acp-client';




function modelOption(groups: Array<[provider: string, models: string[]]>): SessionConfigOption {
  return {
    id: 'model',
    name: 'Model',
    category: 'model',
    type: 'select',
    currentValue: `${groups[0]?.[0] ?? ''}/${groups[0]?.[1][0] ?? ''}`,
    options: groups.map(([provider, models]) => ({
      group: provider,
      name: provider,
      options: models.map(model => ({ value: `${provider}/${model}`, name: model })),
    })),
  };
}

const THINK_OPTION: SessionConfigOption = {
  id: 'think',
  name: 'Think',
  type: 'select',
  currentValue: 'medium',
  options: [
    { value: 'auto', name: 'Auto' },
    { value: 'off', name: 'Off' },
    { value: 'minimal', name: 'Minimal' },
    { value: 'low', name: 'Low' },
    { value: 'medium', name: 'Medium' },
    { value: 'high', name: 'High' },
    { value: 'xhigh', name: 'XHigh' },
  ],
};


const POLICY_OPTION: SessionConfigOption = {
  id: 'hitl-policy',
  name: 'HITL Policy',
  type: 'select',
  currentValue: 'dev',
  options: [
    { value: '__contenox_default__', name: 'Default', description: 'Use strict' },
    { value: 'strict', name: 'strict' },
    { value: 'dev', name: 'dev' },
  ],
};

describe('commandValueDomains', () => {
  it('projects the advertised options onto the four commands that set them', () => {
    const domains = commandValueDomains([
      modelOption([
        ['openai', ['gpt-5-mini']],
        ['anthropic', ['claude-sonnet-4']],
      ]),
      THINK_OPTION,
      POLICY_OPTION,
    ]);

    expect(domains.get(COMMAND_MODEL)).toEqual(['openai/gpt-5-mini', 'anthropic/claude-sonnet-4']);
    expect(domains.get(COMMAND_PROVIDER)).toEqual(['openai', 'anthropic']);
    expect(domains.get(COMMAND_THINK)).toEqual([
      'auto',
      'off',
      'minimal',
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
    expect(domains.get(COMMAND_POLICY)).toEqual(['strict', 'dev']);
  });



  it('leaves the HITL default sentinel out of /policy', () => {
    const domains = commandValueDomains([POLICY_OPTION]);
    expect(domains.get(COMMAND_POLICY)).not.toContain('__contenox_default__');
  });



  it('gives no key to a command with no option behind it', () => {
    const domains = commandValueDomains([THINK_OPTION]);
    expect(domains.has(COMMAND_MODEL)).toBe(false);
    expect(domains.has(COMMAND_POLICY)).toBe(false);
    expect(domains.has('compact')).toBe(false);
    expect(domains.has('mission')).toBe(false);
  });

  it('answers empty for no options at all, and for options it knows nothing about', () => {
    expect(commandValueDomains(undefined).size).toBe(0);
    expect(commandValueDomains([]).size).toBe(0);
    expect(
      commandValueDomains([
        {
          id: 'stub-verbosity',
          name: 'Verbosity',
          type: 'select',
          currentValue: 'high',
          options: [{ value: 'high', name: 'High' }],
        },
      ]).size,
    ).toBe(0);
  });




  it('keeps a slash-bearing model name whole', () => {
    const domains = commandValueDomains([
      modelOption([['gemini', ['models/gemini-3.1-pro-preview']]]),
    ]);
    expect(domains.get(COMMAND_MODEL)).toEqual(['gemini/models/gemini-3.1-pro-preview']);
    expect(domains.get(COMMAND_PROVIDER)).toEqual(['gemini']);
  });




  it('treats every group id as an opaque provider (no placeholder special case)', () => {
    const domains = commandValueDomains([
      {
        id: 'model',
        name: 'Model',
        type: 'select',
        currentValue: 'some-model',
        options: [
          {
            group: 'default',
            name: 'default',
            options: [{ value: 'some-model', name: 'some-model' }],
          },
        ],
      },
    ]);
    expect(domains.get(COMMAND_MODEL)).toEqual(['some-model']);
  });



  it('offers ungrouped model values as they are', () => {
    const domains = commandValueDomains([
      {
        id: 'model',
        name: 'Model',
        type: 'select',
        currentValue: 'local/qwen3-coder',
        options: [
          { value: 'local/qwen3-coder', name: 'qwen3-coder' },
          { value: 'local/devstral', name: 'devstral' },
          { value: 'bare-model', name: 'bare-model' },
        ],
      },
    ]);
    expect(domains.get(COMMAND_MODEL)).toEqual(['local/qwen3-coder', 'local/devstral', 'bare-model']);
    expect(domains.has(COMMAND_PROVIDER)).toBe(false);
  });




  it('preserves wire order, drops blanks and keeps the first of each duplicate', () => {
    const domains = commandValueDomains([
      modelOption([
        ['openai', ['gpt-5', 'gpt-5-mini', 'gpt-5']],
        ['azure', ['gpt-5']],
      ]),
    ]);
    expect(domains.get(COMMAND_MODEL)).toEqual(['openai/gpt-5', 'openai/gpt-5-mini', 'azure/gpt-5']);
    expect(domains.get(COMMAND_PROVIDER)).toEqual(['openai', 'azure']);
  });

  it('trims what the machine sent', () => {
    const domains = commandValueDomains([
      {
        ...THINK_OPTION,
        options: [
          { value: '  medium  ', name: 'Medium' },
          { value: '', name: 'Blank' },
          { value: 'medium', name: 'Medium again' },
        ],
      },
    ]);
    expect(domains.get(COMMAND_THINK)).toEqual(['medium']);
  });



  it('does not answer for a name off Object.prototype', () => {
    const domains = commandValueDomains([THINK_OPTION]);
    expect(domains.get('constructor')).toBeUndefined();
    expect(domains.get('__proto__')).toBeUndefined();
  });

  it('offers opaque values from groups without parsing them or special-casing a group', () => {
    const domains = commandValueDomains([
      {
        id: 'model',
        name: 'Model',
        type: 'select',
        currentValue: '',
        options: [
          { group: 'default', name: 'Any provider', options: [{ value: 'a:b/c', name: 'c' }] },
          { group: 'p1', name: 'P1', options: [{ value: 'p1|x', name: 'x' }] },
        ],
      },
    ]);
    expect(domains.get(COMMAND_MODEL)).toEqual(['a:b/c', 'p1|x']);
  });
});
