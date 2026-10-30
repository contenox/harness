import type { SessionConfigOption, SessionConfigOptionValue } from '@contenox/acp-client';
import {
  Chip,
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  Popover,
  SearchBar,
} from '@contenox/ui';
import { buildChoiceEntries, choiceItems, needsSearch, summarizeChoice } from '@contenox/ui/session-lib';
import { ConfigOptionControl } from '@contenox/ui/session-ui';
import { Folder, FolderPlus, MoreHorizontal } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NewProjectDialog } from '../../../components/workspace/NewProjectDialog';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { displayRootForPath, projectName, shortenRootPath } from '../../../lib/workspaceRoots';
import { filterProjects } from '../lib/projectChoices';

export interface SelectChipProps {
  option: SessionConfigOption;
  onChange: (configId: string, value: SessionConfigOptionValue) => void;
  /** Called when the list opens, so the owner can refresh the catalog behind it. */
  onOpen?: () => void;
  align?: 'start' | 'end';
}

/**
 * A select-type ACP config option as a compact chip. Grouped options show group headers in
 * runtime order; values are opaque. The chip shows the selected value's name plus its group
 * as a small secondary label.
 */
export function SelectChip({ option, onChange, onOpen, align = 'end' }: SelectChipProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const searchable = needsSearch(option);
  const entries = useMemo(() => buildChoiceEntries(option, query), [option, query]);
  if (option.type === 'boolean' || choiceItems(buildChoiceEntries(option)).length === 0) return null;

  const { label, badge, title } = summarizeChoice(option);
  const shown = label ?? t('composer_chips.not_set');
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const pick = (value: string) => {
    onChange(option.id, value);
    close();
  };
  const items = choiceItems(entries);

  return (
    <Dropdown
      align={align}
      side="top"
      isOpen={open}
      onToggle={next => {
        if (!next) {
          close();
          return;
        }
        onOpen?.();
        setOpen(true);
      }}
      contentClassName="w-72"
      trigger={
        <Chip
          caret
          active={open}
          label={
            <>
              {shown}
              {badge && <span className="text-text-subtle ml-1.5 text-xs font-normal">{badge}</span>}
            </>
          }
          className="max-w-[12rem] shrink"
          title={title ?? option.description ?? option.name}
          aria-label={`${option.name}: ${title ?? t('composer_chips.not_set')}`}
        />
      }>
      <div ref={panelRef}>
      {searchable && (
        <div className="p-1 pb-1.5">
          <SearchBar
            autoFocus
            value={query}
            placeholder={t('composer_chips.choice_search')}
            aria-label={t('composer_chips.choice_search')}
            onChange={e => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            onKeyDown={e => {
              if (e.key === 'Enter' && items[0]) {
                e.preventDefault();
                pick(items[0].value);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                panelRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
              }
            }}
          />
        </div>
      )}
      <div role="listbox" aria-label={option.name}>
        {items.length === 0 && (
          <div className="text-text-subtle px-2.5 py-2 text-[13px]">{t('composer_chips.choice_none')}</div>
        )}
        {entries.map(entry =>
          entry.kind === 'header' ? (
            <DropdownLabel key={`h:${entry.key}`} role="presentation">
              {entry.label}
            </DropdownLabel>
          ) : (
            <DropdownItem
              key={entry.value}
              role="option"
              aria-selected={entry.value === option.currentValue}
              selected={entry.value === option.currentValue}
              title={entry.description}
              onClick={() => pick(entry.value)}>
              {entry.label}
            </DropdownItem>
          ),
        )}
      </div>
      </div>
    </Dropdown>
  );
}

export interface OverflowChipProps {
  options: SessionConfigOption[];
  onChange: (configId: string, value: SessionConfigOptionValue) => void;
}

/** Remaining config options (reasoning level, token limit, ...) behind a "…" chip. */
export function OverflowChip({ options, onChange }: OverflowChipProps) {
  const { t } = useTranslation();
  if (options.length === 0) return null;
  return (
    <Popover
      align="end"
      side="top"
      contentClassName="w-64"
      trigger={
        <Chip
          icon={<MoreHorizontal />}
          label=""
          title={t('composer_chips.more')}
          aria-label={t('composer_chips.more')}
        />
      }>
      <div className="flex flex-col gap-3">
        {options.map(option => (
          <ConfigOptionControl
            key={option.id}
            option={option}
            notSetLabel={t('composer_chips.not_set')}
            onChange={value => onChange(option.id, value)}
          />
        ))}
      </div>
    </Popover>
  );
}

export interface ProjectChipProps {
  /** Folder the session runs in (staged root before the session starts). */
  root: string | null;
  /** Before the session exists the chip is a picker; afterwards it is read-only. */
  editable: boolean;
  onSelect: (path: string) => void;
}

export function ProjectChip({ root, editable, onSelect }: ProjectChipProps) {
  const { t } = useTranslation();
  const { roots } = useWorkspaceRoots();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const current = root ? displayRootForPath(root, roots) : null;
  const label = current ? projectName(current) : t('composer_chips.no_project');
  const projects = useMemo(() => filterProjects(roots, query), [roots, query]);

  if (!editable) {
    return (
      <Chip
        disabled
        icon={<Folder />}
        label={label}
        title={root ?? undefined}
        aria-label={t('composer_chips.project_readonly', { name: label })}
        className="max-w-[9rem] shrink disabled:opacity-100"
      />
    );
  }

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Popover
        align="start"
        side="top"
        isOpen={open}
        onToggle={next => (next ? setOpen(true) : close())}
        contentClassName="w-72 p-1"
        trigger={
          <Chip
            caret
            active={open}
            icon={<Folder />}
            label={label}
            className="max-w-[9rem] shrink"
            title={root ?? undefined}
            aria-label={t('composer_chips.project_label', { name: label })}
          />
        }>
        <SearchBar
          aria-label={t('composer_chips.project_search')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          placeholder={t('composer_chips.project_search')}
          onKeyDown={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
        />
        <div role="listbox" aria-label={t('composer_chips.project_list')} className="mt-1 max-h-60 overflow-y-auto">
          {projects.map(p => (
            <DropdownItem
              key={p.path}
              role="option"
              aria-selected={p.path === root}
              selected={p.path === root}
              title={p.path}
              trailing={shortenRootPath(p.path)}
              onClick={() => {
                onSelect(p.path);
                close();
              }}>
              {projectName(p)}
            </DropdownItem>
          ))}
          {projects.length === 0 && <DropdownLabel>{t('composer_chips.project_none')}</DropdownLabel>}
        </div>
        <DropdownSeparator />
        <DropdownItem
          icon={<FolderPlus />}
          onClick={() => {
            setOpen(false);
            setDialogOpen(true);
          }}>
          {t('composer_chips.new_project')}
        </DropdownItem>
      </Popover>
      {/* React bubbles submit through portals: keep the dialog's form from submitting the composer. */}
      <span onSubmit={e => e.stopPropagation()}>
        <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </span>
    </>
  );
}
