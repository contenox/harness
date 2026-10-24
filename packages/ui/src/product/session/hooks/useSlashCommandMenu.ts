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
import { commandValueDomains } from '../lib/commandValueDomains';
import {
  TOP_OF_LIST,
  clampIndex,
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
} from '../lib/slashMenu';

export type SlashMenuMode = 'commands' | 'values';

export interface SlashCommandMenuState {
  open: boolean;
  mode: SlashMenuMode;
  entries: AvailableCommand[];
  values: string[];
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

  const domains = useMemo(() => commandValueDomains(configOptions), [configOptions]);
  const argument = deriveSlashArgument(draft);
  const argCommand = argument?.command ?? null;
  const argText = argument?.arg ?? '';
  const domain = argCommand === null ? null : valueDomainFor(domains, argCommand);
  const values = useMemo(
    () => (domain === null ? [] : filterValueDomain(domain, argText)),
    [domain, argText],
  );




  const mode: SlashMenuMode = domain === null ? 'commands' : 'values';
  const valueCommand = mode === 'values' ? argCommand : null;


  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const length = mode === 'values' ? values.length : entries.length;
  const open = length > 0 && dismissedFor !== draft;


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
      onDraftChange(valueCompletion(valueCommand, value));
      setDismissedFor(null);
    },
    [valueCommand, onDraftChange],
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
      event.preventDefault();
      if (action.type === 'move') {
        highlightAt(clampIndex(activeIndex + action.delta, length));
      } else if (action.type === 'accept') {
        accept();
      } else {
        setDismissedFor(draft);
      }
    },
    [open, activeIndex, length, highlightAt, accept, draft],
  );

  const valueCount = useCallback((name: string) => domains.get(name)?.length ?? 0, [domains]);


  const textareaAria = useMemo<SlashMenuTextareaAria>(
    () =>
      availableCommands.length === 0 && domains.size === 0
        ? {}
        : {
            role: 'combobox',
            'aria-autocomplete': 'list',
            'aria-controls': listboxId,
            'aria-expanded': open,
            'aria-activedescendant': open ? optionId(activeIndex) : undefined,
          },
    [availableCommands.length, domains.size, listboxId, open, optionId, activeIndex],
  );

  return {
    open,
    mode,
    entries,
    values,
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
