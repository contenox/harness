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
import { ConfigOptionControl } from '@contenox/ui/session-ui';
import { Folder, FolderPlus, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NewProjectDialog } from '../../../components/workspace/NewProjectDialog';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { displayRootForPath, projectName, shortenRootPath } from '../../../lib/workspaceRoots';
import { currentChoiceLabel, isModelOption, optionChoices, shortChoiceLabel } from '../lib/composerChips';
import { filterProjects } from '../lib/projectChoices';

export interface SelectChipProps {
  option: SessionConfigOption;
  onChange: (configId: string, value: SessionConfigOptionValue) => void;
  align?: 'start' | 'end';
}

/** A select-type ACP config option as a compact chip showing the current choice. */
export function SelectChip({ option, onChange, align = 'end' }: SelectChipProps) {
  const choices = optionChoices(option);
  const [open, setOpen] = useState(false);
  if (choices.length === 0) return null;
  const fullLabel = currentChoiceLabel(option);
  const label = isModelOption(option) ? shortChoiceLabel(fullLabel) : fullLabel;
  return (
    <Dropdown
      align={align}
      side="top"
      isOpen={open}
      onToggle={setOpen}
      contentClassName="w-64"
      trigger={
        <Chip
          caret
          active={open}
          label={label}
          className="max-w-[9rem] shrink"
          title={label === fullLabel ? (option.description ?? option.name) : `${option.name}: ${fullLabel}`}
          aria-label={`${option.name}: ${fullLabel}`}
        />
      }>
      <div role="listbox" aria-label={option.name}>
        {choices.map(choice => (
          <DropdownItem
            key={choice.value}
            role="option"
            aria-selected={choice.value === option.currentValue}
            selected={choice.value === option.currentValue}
            onClick={() => {
              onChange(option.id, choice.value);
              setOpen(false);
            }}>
            {choice.label}
          </DropdownItem>
        ))}
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
          <ConfigOptionControl key={option.id} option={option} onChange={value => onChange(option.id, value)} />
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
