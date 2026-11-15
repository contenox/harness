import {
  Button,
  ExternalLink,
  Form,
  FormField,
  InlineNotice,
  Input,
  SettingsGroup,
  SettingsRow,
} from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cwdApiFetch } from '../../lib/projectRuntime';
import { jsonRequest } from './repository';

interface Receiver {
  origin: string;
  destination?: string;
  status?: string;
  cursor?: number;
  expiredThrough?: number;
  approvalUrl?: string;
}

export function HostedReceiver({ root }: { root: string }) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const [code, setCode] = useState('');
  const key = ['hosted-receiver', root];
  const endpoint = '/api/workspace/ingress';
  const suffix = '?' + new URLSearchParams({ root });
  const query = useQuery({
    queryKey: key,
    queryFn: () => cwdApiFetch<Receiver>(root, endpoint + suffix),
    refetchInterval: 10000,
    retry: false,
  });
  const change = useMutation({
    mutationFn: (action: 'pair' | 'disconnect' | 'gap') =>
      cwdApiFetch(
        root,
        endpoint + (action === 'gap' ? '/gap' : '') + suffix,
        action === 'disconnect'
          ? { method: 'DELETE' }
          : jsonRequest('POST', action === 'pair' ? { code: code.trim() } : {}),
      ),
    onSuccess: async () => {
      setCode('');
      await cache.invalidateQueries({ queryKey: key });
    },
  });
  const state = query.data;
  const connect = useMutation({
    mutationFn: () =>
      cwdApiFetch<{ url: string }>(root, endpoint + '/connect' + suffix, jsonRequest('POST', {})),
    onSuccess: async ({ url }) => {
      window.open(url, '_blank', 'noopener,noreferrer');
      await cache.invalidateQueries({ queryKey: key });
    },
  });
  if (!state) return null;
  return (
    <SettingsGroup title={t('repoReview.hostedReceiver')}>
      <SettingsRow
        title={state.destination ? t('repoReview.paired') : t('repoReview.pairWorkspace')}
        description={
          state.destination
            ? t('repoReview.receiverStatus', { status: state.status, cursor: state.cursor })
            : t('repoReview.pairHint')
        }
        trailing={
          state.approvalUrl ? (
            <ExternalLink href={state.approvalUrl}>{t('repoReview.finishSignin')}</ExternalLink>
          ) : state.destination ? (
            <ExternalLink href={state.origin}>{t('repoReview.manageReceiver')}</ExternalLink>
          ) : (
            <Button disabled={connect.isPending} onClick={() => connect.mutate()}>
              {t('repoReview.connectContenox')}
            </Button>
          )
        }
      />
      {state.expiredThrough ? (
        <SettingsRow
          title={t('repoReview.expiredEvents', { cursor: state.expiredThrough })}
          trailing={
            <Button
              variant="secondary"
              disabled={change.isPending}
              onClick={() => change.mutate('gap')}>
              {t('repoReview.acceptGap')}
            </Button>
          }
        />
      ) : null}
      {state.destination || state.approvalUrl ? (
        <SettingsRow
          title={t('repoReview.disconnectReceiver')}
          trailing={
            <Button
              variant="ghost"
              disabled={change.isPending}
              onClick={() => change.mutate('disconnect')}>
              {t('repoReview.disconnect')}
            </Button>
          }
        />
      ) : (
        <SettingsRow title={t('repoReview.haveCode')}>
          <Form
            variant="surface"
            onSubmit={e => {
              e.preventDefault();
              change.mutate('pair');
            }}
            actions={
              <Button type="submit" disabled={change.isPending || !code.trim()}>
                {t('repoReview.pairWorkspace')}
              </Button>
            }>
            <FormField label={t('repoReview.pairCode')}>
              <Input
                type="password"
                autoComplete="off"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </FormField>
          </Form>
        </SettingsRow>
      )}
      {connect.error && (
        <InlineNotice variant="error" role="alert">
          {connect.error.message}
        </InlineNotice>
      )}
      {change.error && (
        <InlineNotice variant="error" role="alert">
          {change.error.message}
        </InlineNotice>
      )}
    </SettingsGroup>
  );
}
