import { SearchBar, Select, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { FileTreeModel } from '../hooks/useFileTreeModel';

const ACCESS_OPTION_LABEL_KEY: Record<string, string> = {
  allow: 'workspace.legend_allowed',
  approve: 'workspace.legend_approval',
  deny: 'workspace.legend_blocked',
  unreachable: 'workspace.legend_unreachable',
};

/** Filter type + value inputs above the file tree, with search status lines. */
export function FileTreeFilterBar({ model }: { model: FileTreeModel }) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const { activeType, filterTypes, filterValue, setFilterValue, filterActive, find } = model;
  const inputSpec = activeType?.input;

  return (
    <div className="border-line flex shrink-0 flex-col gap-1.5 border-b px-3 py-2">
      <Select
        aria-label={t('workspace.filter_type')}
        value={activeType?.id ?? ''}
        onChange={e => model.selectFilterType(e.target.value)}
        options={filterTypes.map(ft => ({ value: ft.id, label: tk(ft.labelKey) }))}
        className="w-full"
      />
      {inputSpec?.kind === 'options' ? (
        <Select
          aria-label={t('workspace.filter_label')}
          value={filterValue}
          onChange={e => setFilterValue(e.target.value)}
          placeholder={t('workspace.filter_label')}
          options={inputSpec.options.map(o => ({
            value: o,
            label: ACCESS_OPTION_LABEL_KEY[o] ? tk(ACCESS_OPTION_LABEL_KEY[o]) : o,
          }))}
          className="w-full"
        />
      ) : (
        <SearchBar
          aria-label={t('workspace.filter_label')}
          value={filterValue}
          onChange={e => setFilterValue(e.target.value)}
          onClear={() => setFilterValue('')}
          placeholder={inputSpec?.kind === 'text' ? tk(inputSpec.placeholderKey) : ''}
        />
      )}
      {filterActive && find.status === 'searching' && (
        <Span variant="muted" className="px-0.5 text-[11px]">
          {t('workspace.filter_searching')}
        </Span>
      )}
      {filterActive && find.truncated && (
        <Span variant="muted" className="px-0.5 text-[11px]">
          {t('workspace.filter_truncated', { count: find.count })}
        </Span>
      )}
    </div>
  );
}
