import { describe, expect, it } from 'vitest';
import type { SessionConfigOption } from '@contenox/acp-client';
import {
  findConfigOption,
  flattenGroups,
  fromControlValue,
  isGroupedOptions,
  selectableValues,
  toControlProps,
} from './configOptions';


const THINK: SessionConfigOption = {
  id: 'think',
  name: 'Think',
  type: 'select',
  currentValue: 'high',
  options: [
    { value: 'off', name: 'Off' },
    { value: 'high', name: 'High' },
  ],
};

const MODEL: SessionConfigOption = {
  id: 'model',
  name: 'Model',
  type: 'select',
  currentValue: 'local/qwen3-coder',
  options: [
    {
      group: 'local',
      name: 'Local',
      options: [
        { value: 'local/qwen3-coder', name: 'qwen3-coder' },
        { value: 'local/devstral', name: 'devstral' },
      ],
    },
    { group: 'openai', name: 'OpenAI', options: [{ value: 'openai/gpt-5', name: 'gpt-5' }] },
  ],
};

const STREAM: SessionConfigOption = {
  id: 'stream',
  name: 'Stream',
  type: 'boolean',
  currentValue: 'true',
  options: [],
};

describe('toControlProps', () => {
  it('maps a flat select to its values', () => {
    expect(toControlProps(THINK)).toEqual({
      kind: 'select-flat',
      value: 'high',
      options: [
        { value: 'off', name: 'Off' },
        { value: 'high', name: 'High' },
      ].map(o => ({ value: o.value, label: o.name })),
    });
  });

  it('maps a grouped select to groups, keeping the values untouched', () => {
    const props = toControlProps(MODEL);
    expect(props.kind).toBe('select-grouped');
    expect(props.value).toBe('local/qwen3-coder');
    expect(props.groups).toEqual([
      {
        group: 'local',
        label: 'Local',
        options: [
          { value: 'local/qwen3-coder', label: 'qwen3-coder' },
          { value: 'local/devstral', label: 'devstral' },
        ],
      },
      { group: 'openai', label: 'OpenAI', options: [{ value: 'openai/gpt-5', label: 'gpt-5' }] },
    ]);
  });

  it('lets type:boolean win over whatever the options list says', () => {

    expect(toControlProps(STREAM)).toEqual({ kind: 'boolean', checked: true });
    expect(toControlProps({ ...STREAM, currentValue: 'false' })).toEqual({
      kind: 'boolean',
      checked: false,
    });
  });

  it('survives an option whose values are missing entirely', () => {
    const malformed = { ...THINK, options: undefined } as unknown as SessionConfigOption;
    expect(toControlProps(malformed)).toEqual({ kind: 'select-flat', value: 'high', options: [] });
  });
});

describe('flattenGroups', () => {
  it('folds the group name into each label, because Select renders no optgroup', () => {
    const props = toControlProps(MODEL);
    expect(flattenGroups(props.groups ?? [])).toEqual([
      { value: 'local/qwen3-coder', label: 'Local / qwen3-coder' },
      { value: 'local/devstral', label: 'Local / devstral' },
      { value: 'openai/gpt-5', label: 'OpenAI / gpt-5' },
    ]);
  });
});

describe('fromControlValue', () => {
  it('sends a boolean back as a boolean and everything else as a string', () => {
    expect(fromControlValue('boolean', true)).toBe(true);
    expect(fromControlValue('boolean', 'true')).toBe(true);
    expect(fromControlValue('boolean', 'false')).toBe(false);
    expect(fromControlValue('select-flat', 'high')).toBe('high');
    expect(fromControlValue('select-grouped', 'openai/gpt-5')).toBe('openai/gpt-5');
  });
});

describe('isGroupedOptions / selectableValues / findConfigOption', () => {
  it('tells the two value shapes apart, empty included', () => {
    expect(isGroupedOptions(MODEL.options)).toBe(true);
    expect(isGroupedOptions(THINK.options)).toBe(false);
    expect(isGroupedOptions([])).toBe(false);
    expect(isGroupedOptions(undefined)).toBe(false);
  });

  it('flattens either shape to the values themselves', () => {
    expect(selectableValues(THINK).map(v => v.value)).toEqual(['off', 'high']);
    expect(selectableValues(MODEL).map(v => v.value)).toEqual([
      'local/qwen3-coder',
      'local/devstral',
      'openai/gpt-5',
    ]);
    expect(selectableValues(STREAM)).toEqual([]);
  });

  it('finds an option by id, or reports the agent did not advertise it', () => {
    expect(findConfigOption([THINK, MODEL], 'model')).toBe(MODEL);
    expect(findConfigOption([THINK], 'model')).toBeUndefined();
    expect(findConfigOption(undefined, 'model')).toBeUndefined();
  });
});
