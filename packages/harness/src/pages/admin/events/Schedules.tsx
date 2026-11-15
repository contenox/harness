import { Button, InlineNotice, Input, Select, SettingsGroup, SettingsRow } from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cwdApiFetch } from '../../../lib/projectRuntime';
import { CursorPager } from './CursorPager';
import { useCursorPages } from './useCursorPages';

interface Schedule {
  id: string;
  topic: string;
  next: string;
  createdBy?: string;
  enabled: boolean;
  every?: string;
  cron?: string;
  at?: string;
}
export function Schedules({ root }: { root: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const pages = useCursorPages();
  const key = ['schedules', root];
  const suffix = '?root=' + encodeURIComponent(root);
  const url = '/api/workspace/schedules';
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('every');
  const [when, setWhen] = useState('1h');
  const [open, setOpen] = useState(false);
  const validate = useMutation({
    mutationFn: (every: string) =>
      cwdApiFetch<{ next: string }>(
        root,
        url + '/interval' + suffix + '&every=' + encodeURIComponent(every),
      ),
  });
  const rows = useQuery({
    queryKey: [...key, pages.cursor],
    queryFn: () =>
      cwdApiFetch<{ schedules: Schedule[]; nextCursor: string }>(
        root,
        url + suffix + '&limit=50&cursor=' + encodeURIComponent(pages.cursor),
      ),
    refetchInterval: 15000,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const save = useMutation({
    mutationFn: () =>
      cwdApiFetch(root, url + suffix, {
        method: 'POST',
        body: JSON.stringify({
          topic,
          [mode]: mode === 'at' ? new Date(when).toISOString() : when,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      }),
    onSuccess: () => {
      setOpen(false);
      void invalidate();
    },
  });
  const change = useMutation({
    mutationFn: ({ s, remove }: { s: Schedule; remove: boolean }) =>
      cwdApiFetch(root, url + '/' + s.id + suffix, {
        method: remove ? 'DELETE' : 'PUT',
        body: remove ? undefined : JSON.stringify({ enabled: !s.enabled }),
      }),
    onSuccess: invalidate,
  });
  return (
    <SettingsGroup title={t('subscriptions.schedules')}>
      <CursorPager pages={pages} next={rows.data?.nextCursor} />
      {rows.data?.schedules.map(s => (
        <SettingsRow
          key={s.id}
          icon={<Clock size={16} />}
          title={s.topic}
          description={s.enabled ? new Date(s.next).toLocaleString() : t('subscriptions.paused')}
          trailing={[s.every || s.cron, s.createdBy].filter(Boolean).join(' · ')}>
          <Button disabled={change.isPending} onClick={() => change.mutate({ s, remove: false })}>
            {t(s.enabled ? 'subscriptions.pause' : 'subscriptions.resume')}
          </Button>
          <Button disabled={change.isPending} onClick={() => change.mutate({ s, remove: true })}>
            {t('subscriptions.remove')}
          </Button>
        </SettingsRow>
      ))}
      <SettingsRow
        icon={<Plus size={16} />}
        title={t('subscriptions.newSchedule')}
        description={t('subscriptions.scheduleHint')}
        expanded={open}
        onExpandedChange={expanded => {
          setOpen(expanded);
          validate.reset();
        }}>
        <form
          className="grid gap-3"
          onSubmit={e => {
            e.preventDefault();
            save.mutate();
          }}>
          <label>
            {t('subscriptions.topic')}
            <Input
              required
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="review.due"
            />
          </label>
          <Select
            value={mode}
            aria-label={t('subscriptions.frequency')}
            options={['every', 'at', 'cron'].map(value => ({
              value,
              label: t(('subscriptions.' + value) as 'subscriptions.every'),
            }))}
            onChange={e => {
              validate.reset();
              setMode(e.target.value);
              setWhen(
                e.target.value === 'cron' ? '0 9 * * 1' : e.target.value === 'every' ? '1h' : '',
              );
            }}
          />
          <label>
            {t(('subscriptions.' + mode) as 'subscriptions.every')}
            <Input
              type={mode === 'at' ? 'datetime-local' : 'text'}
              required
              value={when}
              onChange={e => {
                validate.reset();
                setWhen(e.target.value);
              }}
            />
          </label>
          {mode === 'every' && (
            <div className="flex flex-col items-start gap-2">
              <span className="text-muted text-xs">{t('subscriptions.intervalUnits')}</span>
              <Button
                type="button"
                isLoading={validate.isPending}
                onClick={() => validate.mutate(when)}>
                {t('subscriptions.validateInterval')}
              </Button>
              <span role="status" aria-live="polite">
                {validate.data &&
                  t('subscriptions.validInterval', {
                    next: new Date(validate.data.next).toLocaleString(),
                  })}
              </span>
              {validate.error && (
                <InlineNotice variant="error" role="alert">
                  {validate.error.message}
                </InlineNotice>
              )}
            </div>
          )}
          <Button type="submit" disabled={save.isPending}>
            {t('subscriptions.newSchedule')}
          </Button>
        </form>
      </SettingsRow>
      {(rows.error || save.error || change.error) && (
        <InlineNotice variant="error">
          {(rows.error || save.error || change.error)?.message}
        </InlineNotice>
      )}
    </SettingsGroup>
  );
}
