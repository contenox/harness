import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from 'react';
import type { AvailableCommand, SessionConfigOption } from '@contenox/acp-client';
import { FIRST_ARGUMENT_KEY } from '@contenox/acp-client';
import { commandValueDomains } from '../lib/commandValueDomains';
import {
  mergeRuntimeValueDomains,
  runtimeArgumentCompletions,
  runtimeArgumentHint,
  runtimeFlagValues,
} from '../lib/runtimeArgumentCompletions';
import {
  TOP_OF_LIST,
  clampIndex,
  deriveSlashArgument,
  deriveSlashFlagArgument,
  deriveSlashMenuQuery,
  filterSlashCommands,
  filterValueDomain,
  flagValueCompletion,
  resolveValueIndex,
  slashCompletion,
  slashMenuKeyFromEvent,
  valueCompletion,
  valueDomainFor,
  type ValueHighlight,
} from '../lib/slashMenu';

export type SlashMenuMode = 'commands' | 'values';

export interface SlashCommandMenuState {
  open: boolean;
  mode: SlashMenuMode;
  entries: AvailableCommand[];
  values: string[];
  argumentHint: string | null;
  command: string | null;
  activeIndex: number;
  listboxId: string;
  optionId: (index: number) => string;
  pick: (command: AvailableCommand) => void;
  pickValue: (value: string) => void;
  valueCount: (name: string) => number;
  setActiveIndex: (index: number) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  acceptOnSubmit: () => boolean;
  textareaAria: SlashMenuTextareaAria;
}

export type SlashMenuTextareaAria = Pick<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'role' | 'aria-autocomplete' | 'aria-controls' | 'aria-expanded' | 'aria-activedescendant'
>;

export function useSlashCommandMenu(
  draft: string,
  onDraftChange: (value: string) => void,
  availableCommands: AvailableCommand[],
  configOptions: readonly SessionConfigOption[],
): SlashCommandMenuState {
  const baseId = useId();
  const listboxId = `${baseId}-slash-menu`;
  const optionId = useCallback((index: number) => `${baseId}-slash-option-${index}`, [baseId]);

  const { open: derivedOpen, query } = deriveSlashMenuQuery(draft);
  const entries = useMemo(
    () => (derivedOpen ? filterSlashCommands(availableCommands, query) : []),
    [derivedOpen, availableCommands, query],
  );

  const runtime = useMemo(
    () => runtimeArgumentCompletions(availableCommands),
    [availableCommands],
  );
  const domains = useMemo(
    () => mergeRuntimeValueDomains(commandValueDomains(configOptions), runtime),
    [configOptions, runtime],
  );
  const argument = deriveSlashArgument(draft);
  const flagArgument = argument === null ? deriveSlashFlagArgument(draft) : null;
  const argCommand = argument?.command ?? flagArgument?.command ?? null;
  const argKey = flagArgument?.flag ?? FIRST_ARGUMENT_KEY;
  const argText = argument?.arg ?? flagArgument?.arg ?? '';
  const domain =
    argCommand === null
      ? null
      : flagArgument !== null
        ? runtimeFlagValues(runtime, argCommand, argKey)
        : valueDomainFor(domains, argCommand);
  const argumentHint =
    argCommand === null || domain !== null
      ? null
      : runtimeArgumentHint(runtime, argCommand, argKey);
  const values = useMemo(
    () => (domain === null ? [] : filterValueDomain(domain, argText)),
    [domain, argText],
  );

  const mode: SlashMenuMode = domain === null && argumentHint === null ? 'commands' : 'values';
  const valueCommand = mode === 'values' ? argCommand : null;
  const valuePrefix = flagArgument?.prefix ?? null;

  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const length = mode === 'values' ? values.length : entries.length;
  const open = (length > 0 || argumentHint !== null) && dismissedFor !== draft;


  const [highlight, setHighlight] = useState<ValueHighlight>(TOP_OF_LIST);


  useEffect(() => setHighlight(TOP_OF_LIST), [query, argCommand, argText]);
  const activeIndex =
    mode === 'values'
      ? resolveValueIndex(values, highlight)
      : clampIndex(highlight.index, entries.length);

  const highlightAt = useCallback(
    (index: number) => setHighlight({ index, value: values[index] ?? null }),
    [values],
  );
  const setActiveIndex = highlightAt;

  const pick = useCallback(
    (command: AvailableCommand) => {
      onDraftChange(slashCompletion(command));
      setDismissedFor(null);
    },
    [onDraftChange],
  );

  const pickValue = useCallback(
    (value: string) => {
      if (valueCommand === null) return;
      onDraftChange(
        valuePrefix === null
          ? valueCompletion(valueCommand, value)
          : flagValueCompletion(valuePrefix, value),
      );
      setDismissedFor(null);
    },
    [valueCommand, valuePrefix, onDraftChange],
  );

  const accept = useCallback(() => {
    if (mode === 'values') {
      const value = values[activeIndex];
      if (value !== undefined) pickValue(value);
      return;
    }
    const entry = entries[activeIndex];
    if (entry !== undefined) pick(entry);
  }, [mode, values, entries, activeIndex, pick, pickValue]);

  const acceptOnSubmit = useCallback((): boolean => {
    if (!open || mode === 'values') return false;
    const entry = entries[activeIndex];
    if (entry === undefined) return false;
    pick(entry);
    return true;
  }, [open, mode, entries, activeIndex, pick]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!open) return;
      const action = slashMenuKeyFromEvent(event.key);
      if (action === null) return;
      if (length === 0 && action.type !== 'close') return;
      if (
        action.type === 'accept' &&
        mode === 'values' &&
        values[activeIndex]?.toLowerCase() === argText.trim().toLowerCase()
      ) {
        return;
      }
      event.preventDefault();
      if (action.type === 'move') {
        highlightAt(clampIndex(activeIndex + action.delta, length));
      } else if (action.type === 'accept') {
        accept();
      } else {
        setDismissedFor(draft);
      }
    },
    [open, activeIndex, length, highlightAt, accept, draft, mode, values, argText],
  );

  const valueCount = useCallback((name: string) => domains.get(name)?.length ?? 0, [domains]);


  const textareaAria = useMemo<SlashMenuTextareaAria>(
    () =>
      availableCommands.length === 0 && domains.size === 0 && runtime.size === 0
        ? {}
        : {
            role: 'combobox',
            'aria-autocomplete': 'list',
            'aria-controls': listboxId,
            'aria-expanded': open,
            'aria-activedescendant': open ? optionId(activeIndex) : undefined,
          },
    [availableCommands.length, domains.size, runtime.size, listboxId, open, optionId, activeIndex],
  );

  return {
    open,
    mode,
    entries,
    values,
    argumentHint,
    command: valueCommand,
    activeIndex,
    listboxId,
    optionId,
    pick,
    pickValue,
    valueCount,
    setActiveIndex,
    handleKeyDown,
    acceptOnSubmit,
    textareaAria,
  };
}
