import { Panel } from '../../../components/Panel';
import { Span } from '../../../components/Typography';
import { useEffect, useRef } from 'react';
import type { AvailableCommand } from '@contenox/acp-client';
import { commandArgumentHint } from '../lib/slashMenu';
import type { SlashCommandMenuState } from '../hooks/useSlashCommandMenu';

/**
 * The commands the attached machine advertises, offered while a `/` is being typed — and then, once one of them is being argued, the values that command accepts.
 */
export function SlashCommandMenu({ menu }: { menu: SlashCommandMenuState }) {
  if (!menu.open) return null;

  return (
    <Panel
      variant="surface"
      id={menu.listboxId}
      role="listbox"



      aria-label={menu.mode === 'values' ? `Values for /${menu.command}` : 'Commands'}




      className="max-h-48 overflow-y-auto overscroll-contain p-0">
      {menu.mode === 'values'
        ? menu.values.map((value, index) => (
            <ValueRow
              key={value}
              value={value}
              id={menu.optionId(index)}
              selected={index === menu.activeIndex}
              onPick={() => menu.pickValue(value)}
              onHover={() => menu.setActiveIndex(index)}
            />
          ))
        : menu.entries.map((command, index) => (
            <CommandRow
              key={command.name}
              command={command}
              valueCount={menu.valueCount(command.name)}
              id={menu.optionId(index)}
              selected={index === menu.activeIndex}
              onPick={() => menu.pick(command)}
              onHover={() => menu.setActiveIndex(index)}
            />
          ))}
    </Panel>
  );
}


function CommandRow({
  command,
  valueCount,
  id,
  selected,
  onPick,
  onHover,
}: {
  command: AvailableCommand;
  valueCount: number;
  id: string;
  selected: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  const hint = commandArgumentHint(command, valueCount);
  const ref = useVisibleWhenSelected(selected);

  return (
    <button
      ref={ref}
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      onMouseEnter={onHover}
      onMouseDown={event => {
        event.preventDefault();
        onPick();
      }}
      className={rowClassName(selected)}>
      <span className="flex w-full items-baseline gap-2">
        <Span className="text-text dark:text-dark-text font-mono text-sm font-medium">
          /{command.name}
        </Span>
        {hint !== null && (
          <Span variant="muted" className="font-mono text-xs">
            {hint}
          </Span>
        )}
      </span>
      <Span variant="muted" className="w-full truncate text-xs">
        {command.description}
      </Span>
    </button>
  );
}


function ValueRow({
  value,
  id,
  selected,
  onPick,
  onHover,
}: {
  value: string;
  id: string;
  selected: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  const ref = useVisibleWhenSelected(selected);

  return (
    <button
      ref={ref}
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      onMouseEnter={onHover}
      onMouseDown={event => {
        event.preventDefault();
        onPick();
      }}
      className={rowClassName(selected)}>
      <Span className="text-text dark:text-dark-text w-full truncate font-mono text-sm font-medium">
        {value}
      </Span>
    </button>
  );
}


function useVisibleWhenSelected(selected: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  return ref;
}












function rowClassName(selected: boolean): string {
  return (
    'border-b-surface-200 dark:border-b-dark-surface-300 flex w-full flex-col items-start ' +
    'gap-0.5 border-b border-l-2 px-3 py-2 text-left last:border-b-0 ' +
    (selected
      ? 'border-l-primary-500 bg-primary-50 dark:bg-dark-surface-400'
      : 'border-l-transparent hover:bg-surface-100 dark:hover:bg-dark-surface-300')
  );
}
