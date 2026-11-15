import {
  BackButton,
  Button,
  DiffView,
  Disclosure,
  ExternalLink,
  Form,
  FormField,
  InlineNotice,
  P,
  ScreenHeader,
  SettingsGroup,
  SettingsRow,
  Spinner,
  TabPanel,
  Tabs,
  Textarea,
  parsePatch,
} from '@contenox/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileDiff, FileText, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAcpWorkspace } from '../../hooks/useAcpWorkspace';
import { cwdApiFetch } from '../../lib/projectRuntime';
import { CursorPager } from '../admin/events/CursorPager';
import { useCursorPages } from '../admin/events/useCursorPages';
import {
  jsonRequest,
  repositoryApi,
  reviewFile,
  type Binding,
  type Comment,
  type FileChange,
  type Pull,
  type ResultPage,
} from './repository';

type Props = { root: string; binding: Binding; number: number; back: () => void };
function Changes({
  root,
  binding,
  number,
  view,
}: {
  root: string;
  binding: Binding;
  number: number;
  view: 'files' | 'comments';
}) {
  const { t } = useTranslation();
  const pages = useCursorPages();
  const data = useQuery({
    queryKey: ['github-changes', root, binding.id, number, view, pages.cursor],
    queryFn: () =>
      repositoryApi<ResultPage<FileChange | Comment>>(root, view, {
        repoId: String(binding.id),
        number: String(number),
        cursor: pages.cursor,
      }),
  });
  if (data.error) return <InlineNotice variant="error">{data.error.message}</InlineNotice>;
  if (!data.data) return <Spinner size="sm" />;
  return (
    <>
      <SettingsGroup>
        {data.data.items.map(item =>
          'filename' in item ? (
            <SettingsRow
              key={item.filename}
              title={item.filename}
              icon={<FileDiff />}
              trailing={`+${item.additions} −${item.deletions}`}
              defaultExpanded={data.data.items.length === 1}>
              {item.patch ? (
                <DiffView
                  filePath={item.filename}
                  lines={parsePatch(item.patch, item.filename).lines}
                />
              ) : (
                <P variant="muted">{t('repoReview.noPatch')}</P>
              )}
            </SettingsRow>
          ) : (
            <SettingsRow
              key={item.id}
              title={item.path + (item.line ? ' · L' + item.line : '')}
              icon={<MessageSquare />}
              description={[
                item.author,
                item.replyTo && t('repoReview.reply', { id: item.replyTo }),
              ]
                .filter(Boolean)
                .join(' · ')}
              defaultExpanded>
              <P className="whitespace-pre-wrap">{item.body}</P>
            </SettingsRow>
          ),
        )}
        {!data.data.items.length && (
          <SettingsRow
            title={t(view === 'files' ? 'repoReview.noFiles' : 'repoReview.noComments')}
          />
        )}
      </SettingsGroup>
      <CursorPager pages={pages} next={data.data.nextCursor} />
    </>
  );
}

function ReviewActions({ root, binding, pr }: { root: string; binding: Binding; pr: Pull }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const acp = useAcpWorkspace();
  const path = reviewFile(binding.id, pr);
  const [body, setBody] = useState('');
  const launch = useMutation({
    mutationFn: async () => {
      const sid = await acp.newSession(root);
      const sent = acp.sendPrompt(
        t('repoReview.prompt', { number: pr.number, sha: pr.ref, file: path }),
      );
      if (!sent) throw new Error(t('repoReview.sendFailed'));
      navigate('/chat/' + encodeURIComponent(sid));
    },
  });
  const load = useMutation({
    mutationFn: async () => {
      const result = await cwdApiFetch<{ content: string; encoding: string }>(
        root,
        '/api/files/content?' + new URLSearchParams({ root, path }),
      );
      if (result.encoding === 'base64') throw new Error(t('repoReview.binary'));
      return result.content;
    },
    onSuccess: setBody,
  });
  const post = useMutation({
    mutationFn: () =>
      repositoryApi<{ url: string }>(
        root,
        'reviews',
        {},
        jsonRequest('POST', { repoId: binding.id, number: pr.number, head: pr.ref, body }),
      ),
    retry: false,
  });
  const error = launch.error ?? load.error ?? post.error;
  return (
    <>
      <SettingsGroup title={t('repoReview.localReview')}>
        <SettingsRow
          icon={<FileText />}
          title={
            <Button
              variant="text"
              size="sm"
              onClick={() => load.mutate()}
              disabled={load.isPending || post.isPending}>
              {t('repoReview.loadFile')}
            </Button>
          }
          description={path}
          trailing={
            <Button
              variant="primary"
              size="sm"
              disabled={launch.isPending}
              onClick={() => launch.mutate()}>
              {t('repoReview.withAgent')}
            </Button>
          }
        />
      </SettingsGroup>
      {load.isSuccess && (
        <Form
          variant="surface"
          onSubmit={e => {
            e.preventDefault();
            if (binding.credential !== 'public' && !post.isSuccess && body.trim()) post.mutate();
          }}
          actions={
            post.data ? (
              <ExternalLink href={post.data.url}>{t('repoReview.posted')}</ExternalLink>
            ) : binding.credential === 'public' ? (
              <P variant="muted">{t('repoReview.readOnly')}</P>
            ) : (
              <Button type="submit" disabled={!body.trim() || post.isPending}>
                {t('repoReview.post')}
              </Button>
            )
          }>
          <FormField label={t('repoReview.preview')}>
            <Textarea
              rows={7}
              value={body}
              onChange={e => setBody(e.target.value)}
              disabled={post.isPending || post.isSuccess}
            />
          </FormField>
        </Form>
      )}
      {error && (
        <InlineNotice variant="error" role="alert">
          {error.message}
        </InlineNotice>
      )}
    </>
  );
}

export function PullReview({ root, binding, number, back }: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<'files' | 'comments'>('files');
  const pull = useQuery({
    queryKey: ['github-pull', root, binding.id, number],
    queryFn: () =>
      repositoryApi<Pull>(root, 'pull', { repoId: String(binding.id), number: String(number) }),
  });
  const pr = pull.data;
  return (
    <>
      <BackButton label={binding.repo + ' / ' + t('github.tabs.pull_requests')} onClick={back} />
      {pull.error && <InlineNotice variant="error">{pull.error.message}</InlineNotice>}
      {pull.isPending && <Spinner size="sm" />}
      {pr && (
        <>
          <ScreenHeader
            title={pr.title + ' #' + pr.number}
            subtitle={[
              pr.draft && t('repoReview.draft'),
              pr.authorLogin,
              pr.head + ' → ' + pr.base,
              pr.ref.slice(0, 8),
            ]
              .filter(Boolean)
              .join(' · ')}
            actions={<ExternalLink href={pr.url}>GitHub</ExternalLink>}
          />
          {pr.body && (
            <Disclosure label={t('repoReview.description')}>
              <P className="whitespace-pre-wrap">{pr.body}</P>
            </Disclosure>
          )}
          <Tabs
            activeTab={view}
            onTabChange={setView}
            tabs={[
              { id: 'files', label: t('repoReview.files') },
              { id: 'comments', label: t('repoReview.comments') },
            ]}
          />
          <TabPanel tabId={view} activeTab={view}>
            <Changes
              key={view + pr.ref}
              root={root}
              binding={binding}
              number={number}
              view={view}
            />
          </TabPanel>
          <ReviewActions key={pr.ref} root={root} binding={binding} pr={pr} />
        </>
      )}
    </>
  );
}
