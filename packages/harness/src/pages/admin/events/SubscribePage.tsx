import {
  Button,
  Container,
  InlineNotice,
  Input,
  Page,
  Select,
  SettingsGroup,
  SettingsRow,
  Spinner,
  Tabs,
  Textarea,
} from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Radio } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import { cwdApiFetch } from '../../../lib/projectRuntime';
import type { WorkspaceEvent } from '../../../lib/workspaceEvents';
import { projectName } from '../../../lib/workspaceRoots';

import { CursorPager } from './CursorPager';
import { Schedules } from './Schedules';
import { TriggerForm, type Subscription } from './TriggerForm';
import { useCursorPages } from './useCursorPages';
import { Workflows } from './Workflows';

function ProjectEvents({ root }: { root: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [topic, setTopic] = useState('');
  const [payload, setPayload] = useState('{}');
  const [open, setOpen] = useState(false);
  const [replay, setReplay] = useState<number | null>(null);
  const [creating, setCreating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const sections = ['log', 'rules', 'schedules', 'workflows', 'waiting'] as const;
  const [section, setSection] = useState<(typeof sections)[number]>('log');
  const [sessionForm, setSessionForm] = useState(false);
  const [before, setBefore] = useState(0);
  const [filter, setFilter] = useState('');
  const [source, setSource] = useState('');
  const [minutes, setMinutes] = useState('');
  const [newRule, setNewRule] = useState(false);
  const previewPages = useCursorPages();
  const rulePages = useCursorPages();
  const waitingPages = useCursorPages();
  const firingPages = useCursorPages();
  const triggersUrl = '/api/workspace/triggers';
  const rootQuery = '?root=' + encodeURIComponent(root);
  const subscriptions = useQuery({
    queryKey: ['subscriptions', root, rulePages.cursor],
    queryFn: () =>
      cwdApiFetch<{
        nextCursor?: string;
        triggers: Subscription[];
        sessions?: Record<string, string>;
      }>(
        root,
        triggersUrl + rootQuery + '&limit=50&cursor=' + encodeURIComponent(rulePages.cursor),
      ),
  });
  const preview = useQuery({
    queryKey: ['subscriptions', root, 'preview', topic.trim(), previewPages.cursor],
    enabled: open && !!topic.trim(),
    queryFn: ({ signal }) =>
      cwdApiFetch<{ triggers: Subscription[]; nextCursor?: string }>(
        root,
        triggersUrl +
          '/preview' +
          rootQuery +
          '&type=event.fired&subject=' +
          encodeURIComponent(topic.trim()) +
          '&cursor=' +
          encodeURIComponent(previewPages.cursor),
        { signal },
      ),
  });
  const manage = useMutation({
    mutationFn: ({ rule, remove }: { rule: Subscription; remove: boolean }) =>
      cwdApiFetch(root, triggersUrl + '/' + encodeURIComponent(rule.id) + rootQuery, {
        method: remove ? 'DELETE' : 'PUT',
        body: remove ? undefined : JSON.stringify({ ...rule, enabled: !rule.enabled }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['subscriptions', root] });
    },
  });
  const key = ['subscribe-events', root];
  const url = '/api/workspace/events?root=' + encodeURIComponent(root);
  const log = useQuery({
    queryKey: [...key, before, filter, source, minutes],
    queryFn: ({ signal }) =>
      cwdApiFetch<{ events: WorkspaceEvent[] }>(
        root,
        url +
          '&' +
          new URLSearchParams({
            before: String(before),
            limit: '100',
            q: filter,
            source,
            ...(minutes
              ? { after: new Date(Date.now() - Number(minutes) * 60000).toISOString() }
              : {}),
          }),
        {
          signal,
        },
      ),
    refetchInterval: section === 'log' ? 3000 : false,
  });
  const waiting = useQuery({
    queryKey: ['subscriptions', root, 'waiting', waitingPages.cursor],
    queryFn: () =>
      cwdApiFetch<{
        parked: { triggerId: string; nid: number; triggerName: string; error: string }[];
        active: { triggerId: string; nid: number; triggerName: string }[];
        pendingApprovalIds: string[];
        nextCursor?: string;
      }>(
        root,
        triggersUrl +
          '/waiting' +
          rootQuery +
          '&limit=50&cursor=' +
          encodeURIComponent(waitingPages.cursor),
      ),
    enabled: section === 'waiting',
    refetchInterval: 5000,
  });
  const history = useQuery({
    queryKey: ['trigger-firings', root, expanded, firingPages.cursor],
    queryFn: () =>
      cwdApiFetch<{
        nextCursor?: string;
        firings: {
          nid: number;
          triggerName: string;
          status: string;
          error?: string;
          missionId?: string;
        }[];
      }>(
        root,
        triggersUrl +
          '/firings' +
          rootQuery +
          '&nid=' +
          expanded +
          '&limit=50&cursor=' +
          encodeURIComponent(firingPages.cursor),
      ),
    enabled: expanded !== null && section === 'log',
    refetchInterval: section === 'log' ? 3000 : false,
  });
  const publish = useMutation({
    mutationFn: () =>
      replay !== null
        ? cwdApiFetch(root, `/api/workspace/events/${replay}/replay${rootQuery}`, {
            method: 'POST',
          })
        : cwdApiFetch(root, url, {
            method: 'POST',
            body: JSON.stringify({
              type: 'event.fired',
              subject: topic.trim(),
              data: JSON.parse(payload),
            }),
          }),
    onSuccess: () => {
      setOpen(false);
      setReplay(null);
      void client.invalidateQueries({ queryKey: key });
    },
  });
  const oldest = log.data?.events.at(-1)?.nid;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    publish.mutate();
  };
  return (
    <>
      <Tabs
        activeTab={section}
        tabs={sections.map(id => ({ id, label: t(`subscriptions.${id}`) }))}
        onTabChange={setSection}
      />
      <div
        role="tabpanel"
        id={'panel-' + section}
        aria-labelledby={'tab-' + section}
        className="flex flex-col gap-4">
        {section === 'log' && (
          <>
            <div id="event-compose">
              <SettingsGroup>
                <SettingsRow
                  title={t(replay === null ? 'subscriptions.test' : 'subscriptions.replay')}
                  icon={<Plus size={16} />}
                  expanded={open}
                  onExpandedChange={value => {
                    setOpen(value);
                    if (!value) setReplay(null);
                  }}>
                  <form onSubmit={submit} className="flex flex-col items-start gap-3">
                    <label className="w-full">
                      {t('subscriptions.topic')}
                      <Input
                        required
                        readOnly={replay !== null}
                        value={topic}
                        placeholder="review.requested"
                        onChange={e => {
                          setTopic(e.target.value);
                          previewPages.reset();
                        }}
                      />
                    </label>
                    <label className="w-full">
                      {t('subscriptions.payload')}
                      <Textarea
                        readOnly={replay !== null}
                        required
                        value={payload}
                        onChange={e => setPayload(e.target.value)}
                      />
                    </label>
                    <CursorPager pages={previewPages} next={preview.data?.nextCursor} />
                    {preview.isFetching && <Spinner />}
                    {preview.error && (
                      <InlineNotice variant="error">{preview.error.message}</InlineNotice>
                    )}
                    {preview.data && (
                      <p>
                        {preview.data.triggers.length
                          ? preview.data.triggers
                              .map(x =>
                                [x.name, x.target, x.agentName || x.sessionId, x.hitlPolicyName]
                                  .filter(Boolean)
                                  .join(' · '),
                              )
                              .join('; ')
                          : t('subscriptions.noMatch')}
                      </p>
                    )}
                    {publish.error && (
                      <InlineNotice variant="error">{publish.error.message}</InlineNotice>
                    )}
                    <Button
                      type="submit"
                      disabled={
                        publish.isPending ||
                        !preview.isSuccess ||
                        preview.isFetching ||
                        !topic.trim()
                      }>
                      {t(replay === null ? 'subscriptions.fire' : 'subscriptions.replay')}
                    </Button>
                  </form>
                </SettingsRow>
              </SettingsGroup>
            </div>
            <SettingsGroup>
              <Input
                aria-label={t('subscriptions.filter')}
                placeholder={t('subscriptions.filter')}
                value={filter}
                onChange={e => {
                  setBefore(0);
                  setFilter(e.target.value);
                }}
              />
              <div className="flex flex-wrap gap-2 px-3 py-2">
                <Select
                  aria-label={t('subscriptions.source')}
                  value={source}
                  options={[
                    { value: '', label: t('subscriptions.allSources') },
                    ...[
                      'agent',
                      'human',
                      'schedule',
                      'trigger',
                      'watcher',
                      'editor',
                      'tool',
                      'approval',
                    ].map(value => ({ value, label: value })),
                  ]}
                  onChange={e => {
                    setBefore(0);
                    setSource(e.target.value);
                  }}
                />
                <Select
                  aria-label={t('subscriptions.time')}
                  value={minutes}
                  options={[
                    { value: '', label: t('subscriptions.allTime') },
                    ...['3', '15', '60', '1440'].map(value => ({ value, label: value + ' min' })),
                  ]}
                  onChange={e => {
                    setBefore(0);
                    setMinutes(e.target.value);
                  }}
                />
              </div>
              {log.isLoading && <Spinner />}
              {log.error && <InlineNotice variant="error">{log.error.message}</InlineNotice>}
              {log.data?.events.length === 0 && <SettingsRow title={t('subscriptions.empty')} />}
              {log.data?.events.map(event => (
                <SettingsRow
                  key={event.nid}
                  expanded={expanded === event.nid}
                  onExpandedChange={v => {
                    setExpanded(v ? event.nid : null);
                    firingPages.reset();
                  }}
                  icon={<Radio size={16} />}
                  title={event.type === 'event.fired' ? event.subject : event.type}
                  description={[
                    `#${event.nid}`,
                    event.source,
                    event.replayedFrom
                      ? t('subscriptions.replayed', { nid: event.replayedFrom })
                      : '',
                    event.type === 'event.fired' ? '' : event.subject,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  trailing={new Date(event.time).toLocaleTimeString()}>
                  <pre className="bg-surface my-2 max-h-64 overflow-auto rounded-md p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                  {expanded === event.nid && (
                    <CursorPager pages={firingPages} next={history.data?.nextCursor} />
                  )}
                  {history.error && (
                    <InlineNotice variant="error">{history.error.message}</InlineNotice>
                  )}
                  {history.data?.firings
                    .filter(f => f.nid === event.nid)
                    .map(f => (
                      <p key={f.triggerName}>
                        {f.triggerName} · {f.status} {f.error}{' '}
                        {f.missionId && <a href={'#/missions/' + f.missionId}>{f.missionId}</a>}
                      </p>
                    ))}
                  <div className="flex flex-wrap gap-2">
                    {event.type === 'event.fired' && (
                      <Button
                        onClick={() => {
                          setReplay(null);
                          setTopic(event.subject);
                          setPayload(JSON.stringify(event.data ?? {}, null, 2));
                          setOpen(true);
                          document.getElementById('event-compose')?.scrollIntoView();
                        }}>
                        {t('subscriptions.test')}
                      </Button>
                    )}
                    {event.type === 'event.fired' && (
                      <Button
                        onClick={() => {
                          setReplay(event.nid);
                          setTopic(event.subject);
                          setPayload(JSON.stringify(event.data, null, 2));
                          setOpen(true);
                          document.getElementById('event-compose')?.scrollIntoView();
                        }}>
                        {t('subscriptions.replay')}
                      </Button>
                    )}
                    {[
                      'event.fired',
                      'fs.created',
                      'fs.modified',
                      'fs.deleted',
                      'fs.moved',
                      'editor.saved',
                    ].includes(event.type) && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSessionForm(false);
                          setCreating(creating === event.nid ? null : event.nid);
                        }}>
                        {t('subscriptions.create')}
                      </Button>
                    )}
                  </div>
                  {event.type === 'event.fired' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSessionForm(true);
                        setCreating(event.nid);
                      }}>
                      {t('subscriptions.new')}
                    </Button>
                  )}
                  {creating === event.nid && (
                    <TriggerForm
                      key={String(sessionForm)}
                      initialTarget={sessionForm ? 'new' : 'mission'}
                      sessions={subscriptions.data?.sessions}
                      root={root}
                      event={event}
                      onDone={() => setCreating(null)}
                    />
                  )}
                </SettingsRow>
              ))}
            </SettingsGroup>
            {(before > 0 || log.data?.events.length === 100) && (
              <div className="flex gap-2">
                {before > 0 && (
                  <Button onClick={() => setBefore(0)}>{t('subscriptions.latest')}</Button>
                )}
                {log.data?.events.length === 100 && oldest !== undefined && (
                  <Button onClick={() => setBefore(oldest)}>{t('subscriptions.older')}</Button>
                )}
              </div>
            )}
          </>
        )}
        {section === 'rules' && (
          <>
            <SettingsGroup>
              <SettingsRow
                title={t('subscriptions.create')}
                expanded={newRule}
                onExpandedChange={setNewRule}
                icon={<Plus size={16} />}>
                <TriggerForm
                  root={root}
                  sessions={subscriptions.data?.sessions}
                  onDone={() => setNewRule(false)}
                />
              </SettingsRow>
            </SettingsGroup>
            {subscriptions.error && (
              <InlineNotice variant="error">{subscriptions.error.message}</InlineNotice>
            )}
            <CursorPager pages={rulePages} next={subscriptions.data?.nextCursor} />
            {!!subscriptions.data?.triggers.length && (
              <SettingsGroup title={t('subscriptions.rules')}>
                {subscriptions.data.triggers.map(rule => (
                  <SettingsRow
                    key={rule.id}
                    title={rule.name}
                    description={[
                      rule.topicGlob || rule.pathGlob,
                      rule.target,
                      rule.agentName,
                      rule.hitlPolicyName,
                      rule.createdBy,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    trailing={t(rule.enabled ? 'subscriptions.active' : 'subscriptions.paused')}>
                    <p>{rule.prompt}</p>
                    <Button
                      disabled={manage.isPending}
                      onClick={() => manage.mutate({ rule, remove: false })}>
                      {t(rule.enabled ? 'subscriptions.pause' : 'subscriptions.resume')}
                    </Button>
                    <Button
                      disabled={manage.isPending}
                      onClick={() => manage.mutate({ rule, remove: true })}>
                      {t('subscriptions.remove')}
                    </Button>
                  </SettingsRow>
                ))}
              </SettingsGroup>
            )}
            {manage.error && <InlineNotice variant="error">{manage.error.message}</InlineNotice>}
          </>
        )}
        {section === 'waiting' && (
          <SettingsGroup>
            <CursorPager pages={waitingPages} next={waiting.data?.nextCursor} />
            {waiting.error && <InlineNotice variant="error">{waiting.error.message}</InlineNotice>}
            {waiting.data && !waiting.data.active.length && !waiting.data.parked.length && (
              <SettingsRow title={t('subscriptions.clear')} />
            )}
            {waiting.data?.active.map(f => (
              <SettingsRow
                key={f.triggerId + f.nid}
                title={f.triggerName}
                description={'#' + f.nid}
                trailing={t('subscriptions.active')}
              />
            ))}
            {waiting.data?.parked.map(f => (
              <SettingsRow
                key={f.triggerId + f.nid}
                title={f.triggerName}
                description={f.error}
                trailing={'#' + f.nid}
              />
            ))}
            {!!waiting.data?.pendingApprovalIds.length && (
              <a href="#/inbox">{t('subscriptions.openInbox')}</a>
            )}
          </SettingsGroup>
        )}
        {section === 'workflows' && <Workflows root={root} />}
        {section === 'schedules' && <Schedules root={root} />}
      </div>
    </>
  );
}

export default function SubscribePage() {
  const { t } = useTranslation();
  const projects = useWorkspaceRoots();
  const [selected, setSelected] = useState('');
  const root =
    projects.roots.find(r => r.path === selected)?.path ??
    projects.defaultRoot?.path ??
    projects.roots[0]?.path;
  return (
    <Page bodyScroll="auto" className="h-full">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {projects.error && <InlineNotice variant="error">{projects.error.message}</InlineNotice>}
          {projects.isLoading && <Spinner />}
          {root ? (
            <>
              <Select
                aria-label={t('subscriptions.root')}
                className="w-fit"
                options={projects.roots.map(r => ({ value: r.path, label: projectName(r) }))}
                value={root}
                onChange={e => setSelected(e.target.value)}
              />
              <ProjectEvents key={root} root={root} />
            </>
          ) : (
            !projects.isLoading && !projects.error && <p>{t('subscriptions.missing')}</p>
          )}
        </div>
      </Container>
    </Page>
  );
}
