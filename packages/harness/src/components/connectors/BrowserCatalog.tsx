import { Button, Dialog, InlineNotice } from '@contenox/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { refreshConnectors } from '../../hooks/useConnectors';
import { api } from '../../lib/api';
import { browserInstallation } from '../../lib/connectorStatus';
import type { Connector } from '../../lib/connectorTypes';
import type { WorkspaceChoice } from './ConnectorForm';

export function BrowserCatalog({
  connectors,
  workspaces,
}: {
  connectors: Connector[];
  workspaces: WorkspaceChoice[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('');
  const existing = connectors.find(c => c.name === 'browser');
  const installed = browserInstallation(existing);
  const install = useMutation({
    mutationFn: async () => {
      const id = crypto.randomUUID();
      const config = await window.contenoxDesktop!.browser!.connector(id);
      if ('error' in config) throw new Error(config.error);
      await api.createMcpServer({ ...config, workspace: scope || undefined });
      return id;
    },
    onSuccess: id => {
      refreshConnectors(cache);
      setOpen(false);
      navigate('/browser/' + id);
    },
  });
  return (
    <>
      <button
        type="button"
        className="border-line bg-raised hover:bg-hover flex items-center gap-3 rounded-xl border p-3.5 text-left"
        onClick={() => (installed ? navigate('/browser/' + installed) : setOpen(true))}>
        <Globe className="text-accent size-5 shrink-0" />
        <span className="flex-1">
          <strong className="block text-sm">Browser</strong>
          <span className="text-text-muted text-xs">{t('browser.description')}</span>
        </span>
        <span className="text-link text-xs">
          {t(installed ? 'browser.open' : 'browser.install')}
        </span>
      </button>
      {open && (
        <Dialog
          open
          title={t('browser.install_title')}
          closeLabel={t('common.close')}
          onClose={() => {
            if (!install.isPending) setOpen(false);
          }}>
          <label className="flex flex-col gap-2">
            {t('browser.scope')}
            <select
              className="border-line bg-raised rounded border p-2"
              value={scope}
              onChange={e => setScope(e.target.value)}>
              <option value="">{t('connectors.group_everywhere')}</option>
              {workspaces.map(w => (
                <option key={w.path} value={w.path}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          {existing && <InlineNotice variant="error">{t('browser.conflict')}</InlineNotice>}
          {install.error && <InlineNotice variant="error">{install.error.message}</InlineNotice>}
          <Button
            className="mt-4"
            disabled={!!existing || install.isPending}
            onClick={() => install.mutate()}>
            {t('browser.install')}
          </Button>
        </Dialog>
      )}
    </>
  );
}
