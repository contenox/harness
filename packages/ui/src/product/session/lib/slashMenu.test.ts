import { describe, expect, it } from 'vitest';
import {
  TOP_OF_LIST,
  clampIndex,
  commandArgumentHint,
  deriveSlashArgument,
  deriveSlashMenuQuery,
  filterSlashCommands,
  filterValueDomain,
  resolveValueIndex,
  slashCompletion,
  slashMenuKeyFromEvent,
  valueCompletion,
  valueDomainFor,
  type ValueHighlight,
} from './slashMenu';
import type { CommandValueDomains } from './commandValueDomains';
import type { AvailableCommand } from '@contenox/acp-client';

const COMMANDS: AvailableCommand[] = [
  { name: 'help', description: 'List the available commands.' },
  { name: 'clear', description: "Clear this session's conversation history." },
  { name: 'compact', description: 'Summarize older history.', input: { hint: '[keep]' } },
  { name: 'rename', description: "Set this session's title.", input: { hint: '[title|-]' } },
  { name: 'max-tokens', description: 'Set the response cap.', input: { hint: '[count]' } },
];

describe('deriveSlashMenuQuery', () => {
  it('opens on the bare slash with an empty query', () => {
    expect(deriveSlashMenuQuery('/')).toEqual({ open: true, query: '' });
  });

  it('carries what has been typed after the slash as the query', () => {
    expect(deriveSlashMenuQuery('/comp')).toEqual({ open: true, query: 'comp' });
  });

  it('accepts the characters a command name is made of', () => {
    expect(deriveSlashMenuQuery('/max-tokens')).toEqual({ open: true, query: 'max-tokens' });
  });

  it('stays closed on an empty draft', () => {
    expect(deriveSlashMenuQuery('')).toEqual({ open: false, query: '' });
  });




  it('closes once an argument has started', () => {
    expect(deriveSlashMenuQuery('/rename ').open).toBe(false);
    expect(deriveSlashMenuQuery('/rename the countdown bug').open).toBe(false);
  });

  it('ignores a slash that is not at the start of the draft', () => {
    expect(deriveSlashMenuQuery('look at src/lib').open).toBe(false);
    expect(deriveSlashMenuQuery(' /help').open).toBe(false);
    expect(deriveSlashMenuQuery('what does /help do').open).toBe(false);
  });

  it('does not open on a path pasted into an empty composer', () => {
    expect(deriveSlashMenuQuery('/home/ada/src/contenox').open).toBe(false);
  });
});

describe('filterSlashCommands', () => {
  it('returns everything for the empty query', () => {
    expect(filterSlashCommands(COMMANDS, '')).toHaveLength(COMMANDS.length);
  });

  it('matches by prefix, case-insensitively', () => {
    expect(filterSlashCommands(COMMANDS, 'C').map(c => c.name)).toEqual(['clear', 'compact']);
    expect(filterSlashCommands(COMMANDS, 'comp').map(c => c.name)).toEqual(['compact']);
  });

  it('matches on the prefix only — the name, not the description', () => {
    expect(filterSlashCommands(COMMANDS, 'history')).toEqual([]);
  });

  it('answers empty for a query that matches nothing', () => {
    expect(filterSlashCommands(COMMANDS, 'zzz')).toEqual([]);
  });



  it('answers empty when the machine advertised nothing', () => {
    expect(filterSlashCommands([], '')).toEqual([]);
  });
});

describe('commandArgumentHint', () => {
  it('is null for a command that takes no argument', () => {
    expect(commandArgumentHint(COMMANDS[0])).toBeNull();
  });

  it('is the hint the agent wrote', () => {
    expect(commandArgumentHint(COMMANDS[2])).toBe('[keep]');
    expect(commandArgumentHint(COMMANDS[3])).toBe('[title|-]');
  });



  it('still reports an argument when the input names no hint', () => {
    expect(commandArgumentHint({ name: 'mission', description: 'Fire one.', input: {} })).toBe('…');
    expect(
      commandArgumentHint({ name: 'mission', description: 'Fire one.', input: { hint: '  ' } }),
    ).toBe('…');
  });



  it('carries the size of the command’s value domain', () => {
    const model: AvailableCommand = { name: 'model', description: 'Set it.', input: {} };
    const policy: AvailableCommand = {
      name: 'policy',
      description: 'Switch it.',
      input: { hint: '<preset>' },
    };
    expect(commandArgumentHint(model, 8)).toBe('(8 values)');
    expect(commandArgumentHint(policy, 2)).toBe('<preset> (2 values)');

    expect(commandArgumentHint(COMMANDS[3], 0)).toBe('[title|-]');

    expect(commandArgumentHint(COMMANDS[0], 0)).toBeNull();
  });



  it('counts one value in the singular', () => {
    expect(commandArgumentHint(COMMANDS[0], 1)).toBe('(1 value)');
  });
});

describe('slashCompletion', () => {
  it('fills the composer with the command and a space to type into', () => {
    expect(slashCompletion(COMMANDS[2])).toBe('/compact ');
  });



  it('produces a draft the menu is closed for', () => {
    expect(deriveSlashMenuQuery(slashCompletion(COMMANDS[0])).open).toBe(false);
  });
});

describe('slashMenuKeyFromEvent', () => {
  it('moves the selection with the arrows', () => {
    expect(slashMenuKeyFromEvent('ArrowDown')).toEqual({ type: 'move', delta: 1 });
    expect(slashMenuKeyFromEvent('ArrowUp')).toEqual({ type: 'move', delta: -1 });
  });

  it('accepts on Tab and Enter and closes on Escape', () => {
    expect(slashMenuKeyFromEvent('Tab')).toEqual({ type: 'accept' });
    expect(slashMenuKeyFromEvent('Enter')).toEqual({ type: 'accept' });
    expect(slashMenuKeyFromEvent('Escape')).toEqual({ type: 'close' });
  });

  it('leaves every other key alone', () => {
    expect(slashMenuKeyFromEvent('a')).toBeNull();
    expect(slashMenuKeyFromEvent('Backspace')).toBeNull();
    expect(slashMenuKeyFromEvent(' ')).toBeNull();
  });
});


const MODEL_DOMAIN = [
  'gpt-5-mini',
  'gpt-5',
  'claude-sonnet-4',
  'claude-opus-4',
  'gemini-3.1-pro',
  'llama-4-scout',
  'qwen3-coder',
  'devstral-small',
];

const DOMAINS: CommandValueDomains = new Map([
  ['model', MODEL_DOMAIN],
  ['policy', ['hitl-policy-strict.json', 'hitl-policy-dev.json']],
]);


function valuesFor(draft: string): string[] | null {
  const argument = deriveSlashArgument(draft);
  if (argument === null) return null;
  const domain = valueDomainFor(DOMAINS, argument.command);
  return domain === null ? null : filterValueDomain(domain, argument.arg);
}


function move(values: string[], highlight: ValueHighlight, delta: number): ValueHighlight {
  const index = clampIndex(resolveValueIndex(values, highlight) + delta, values.length);
  return { index, value: values[index] ?? null };
}

describe('deriveSlashArgument', () => {
  it('splits the command from the argument once the space is typed', () => {
    expect(deriveSlashArgument('/model ')).toEqual({ command: 'model', arg: '' });
    expect(deriveSlashArgument('/model gpt')).toEqual({ command: 'model', arg: 'gpt' });
  });



  it('is null before the space arrives', () => {
    expect(deriveSlashArgument('/model')).toBeNull();
    expect(deriveSlashArgument('/')).toBeNull();
    expect(deriveSlashArgument('')).toBeNull();
  });



  it('is null past the first argument', () => {
    expect(deriveSlashArgument('/model gpt-5 and then some')).toBeNull();
    expect(deriveSlashArgument('/mission agent do the thing')).toBeNull();
  });

  it('needs the slash at the very start, like the command menu', () => {
    expect(deriveSlashArgument(' /model gpt')).toBeNull();
    expect(deriveSlashArgument('what does /model do')).toBeNull();
    expect(deriveSlashArgument('/ gpt')).toBeNull();
  });
});

describe('valueDomainFor / value mode', () => {
  it('offers the whole domain the moment the space is typed', () => {
    expect(valuesFor('/model ')).toEqual(MODEL_DOMAIN);
  });

  it('offers nothing before the space, even for a command that has a domain', () => {
    expect(valuesFor('/model')).toBeNull();
  });



  it('offers nothing for a command with no domain, or for one that does not exist', () => {
    expect(valuesFor('/compact 12')).toBeNull();
    expect(valuesFor('/definitely-not-a-command x')).toBeNull();
  });



  it('treats an empty domain as no domain', () => {
    expect(valueDomainFor(new Map([['model', []]]), 'model')).toBeNull();
    expect(valueDomainFor(new Map(), 'model')).toBeNull();
  });
});

describe('filterValueDomain', () => {
  it('ranks prefix matches before substring matches, each in the machine’s order', () => {
    expect(valuesFor('/model c')).toEqual([
      'claude-sonnet-4',
      'claude-opus-4',
      'llama-4-scout',
      'qwen3-coder',
    ]);
  });

  it('is case-insensitive, like the command filter', () => {
    expect(valuesFor('/model CLAUDE-OPUS')).toEqual(['claude-opus-4']);
  });



  it('answers empty for a value the machine never advertised', () => {
    expect(valuesFor('/model zzz')).toEqual([]);

    expect(deriveSlashArgument('/model zzz')).toEqual({ command: 'model', arg: 'zzz' });
  });

  it('returns a copy, so the caller cannot edit the machine’s list', () => {
    const filtered = filterValueDomain(MODEL_DOMAIN, '');
    filtered.push('invented');
    expect(MODEL_DOMAIN).toHaveLength(8);
  });
});

describe('valueCompletion', () => {
  it('writes the command and the value and ends the menu query', () => {
    const completed = valueCompletion('model', 'claude-sonnet-4');
    expect(completed).toBe('/model claude-sonnet-4 ');
    expect(deriveSlashArgument(completed)).toBeNull();
    expect(deriveSlashMenuQuery(completed).open).toBe(false);
  });
});

describe('resolveValueIndex', () => {
  it('starts at the top of the list', () => {
    expect(resolveValueIndex(MODEL_DOMAIN, TOP_OF_LIST)).toBe(0);
    expect(resolveValueIndex([], TOP_OF_LIST)).toBe(0);
  });

  it('walks the values with the arrows', () => {
    const highlight = move(MODEL_DOMAIN, TOP_OF_LIST, 2);
    expect(MODEL_DOMAIN[resolveValueIndex(MODEL_DOMAIN, highlight)]).toBe('claude-sonnet-4');
  });



  it('wraps past the end, like the command list', () => {
    const highlight = move(MODEL_DOMAIN, TOP_OF_LIST, -1);
    expect(MODEL_DOMAIN[resolveValueIndex(MODEL_DOMAIN, highlight)]).toBe('devstral-small');
  });




  it('follows the highlighted value when the machine re-pushes a different domain', () => {
    const highlight = move(MODEL_DOMAIN, TOP_OF_LIST, 3);
    expect(MODEL_DOMAIN[highlight.index]).toBe('claude-opus-4');

    const replaced = ['gpt-5', 'claude-opus-4', 'gpt-5-mini'];
    expect(replaced[resolveValueIndex(replaced, highlight)]).toBe('claude-opus-4');
  });


  it('clamps to the position when the highlighted value is no longer offered', () => {
    const highlight: ValueHighlight = { index: 5, value: 'llama-4-scout' };
    expect(resolveValueIndex(['gpt-5', 'gpt-5-mini'], highlight)).toBe(1);
  });
});

describe('clampIndex', () => {
  it('wraps past the end and before the start', () => {
    expect(clampIndex(3, 3)).toBe(0);
    expect(clampIndex(-1, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
  });

  it('is 0 for an empty list', () => {
    expect(clampIndex(2, 0)).toBe(0);
    expect(clampIndex(-2, 0)).toBe(0);
  });
});
