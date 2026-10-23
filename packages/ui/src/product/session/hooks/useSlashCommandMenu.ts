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

/**
 * Which list the menu is showing: the command names, or one command's values.
 */
export type SlashMenuMode = 'commands' | 'values';

/**
 * What the composer needs in order to render and drive the menu.
 */
export interface SlashCommandMenuState {
  /**
   * Whether there is a list to show right now.
   */
  open: boolean;
  /**
   * Which of the two lists `open` refers to.
   */
  mode: SlashMenuMode;
  /**
   * The advertised commands matching what has been typed, in the machine's own order.
   */
  entries: AvailableCommand[];
  /**
   * The matching values of the command being argued, in the machine's own order.
   */
  values: string[];
  /**
   * The command whose values are listed, or null in command mode.
   */
  command: string | null;
  /**
   * Index of the highlighted row in whichever list `mode` names — always in range.
   */
  activeIndex: number;
  /**
   * DOM id of the listbox, so the textarea can point at it.
   */
  listboxId: string;
  /**
   * DOM id of one row, so the textarea can name the active one.
   */
  optionId: (index: number) => string;
  /**
   * Fills the composer with a command.
   */
  pick: (command: AvailableCommand) => void;
  /**
   * Fills the command's argument with one of its values.
   */
  pickValue: (value: string) => void;
  /**
   * How many values a command accepts, for the hint beside its name.
   */
  valueCount: (name: string) => number;
  /**
   * Moves the highlight, e.g. as a thumb drags over the list.
   */
  setActiveIndex: (index: number) => void;
  /**
   * Arrow/Tab/Escape while the menu is open.
   */
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  /**
   * Consumes a submit that was meant to accept the highlighted row rather than send the draft, reporting whether it did.
   */
  acceptOnSubmit: () => boolean;
  /**
   * aria wiring for the textarea.
   */
  textareaAria: SlashMenuTextareaAria;
}

/**
 * The combobox half of the pattern, on the textarea: what it controls, whether that list is showing, and which row is current.
 */
export type SlashMenuTextareaAria = Pick<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'role' | 'aria-autocomplete' | 'aria-controls' | 'aria-expanded' | 'aria-activedescendant'
>;

/**
 * The composer's slash-command menu: what is open, what it is filtered to, and which row is selected.
 */
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
