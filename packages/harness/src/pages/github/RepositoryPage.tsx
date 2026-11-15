import {
  Button,
  Container,
  Form,
  FormField,
  InlineNotice,
  P,
  Page,
  ScreenBody,
  ScreenHeader,
  Select,
  SettingsGroup,
  SettingsRow,
  Spinner,
} from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitPullRequest } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { folderBasename } from '../../components/workspace/folderTree';
import { CursorPager } from '../admin/events/CursorPager';
import { useCursorPages } from '../admin/events/useCursorPages';
import { PullReview } from './PullReview';
import { HostedReceiver } from './HostedReceiver';
import {
  jsonRequest,
  repositoryApi,
  type Binding,
  type Pull,
  type ResultPage,
  type State,
} from './repository';

function PullList({
  root,
  binding,
  branch,
  open,
}: {
  root: string;
  binding: Binding;
  branch?: string;
  open: (n: number) => void;
}) {
  const { t } = useTranslation();
  const pages = useCursorPages();
  const prs = useQuery({
    queryKey: ['github-pulls', root, binding.id, pages.cursor],
    queryFn: () =>
      repositoryApi<ResultPage<Pull>>(root, 'pulls', {
        repoId: String(binding.id),
        cursor: pages.cursor,
      }),
  });
  return (
    <>
      {prs.isPending && <Spinner size="sm" />}
      {prs.error && <InlineNotice variant="error">{prs.error.message}</InlineNotice>}
      <SettingsGroup title={t('github.tabs.pull_requests')}>
        {prs.data?.items.map(pr => (
          <SettingsRow
            key={pr.number}
            icon={<GitPullRequest />}
            title={
              <Button variant="text" onClick={() => open(pr.number)}>
                {pr.title}
              </Button>
            }
            description={[
              '#' + pr.number,
              pr.authorLogin,
              pr.head + ' → ' + pr.base,
              pr.draft && t('repoReview.draft'),
              pr.head === branch &&
                binding.repo.split('/')[0].toLowerCase() === pr.headOwner.toLowerCase() &&
                t('repoReview.currentBranch'),
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        ))}
        {prs.data?.items.length === 0 && <SettingsRow title={t('github.no_prs')} />}
      </SettingsGroup>
      <CursorPager pages={pages} next={prs.data?.nextCursor} />
    </>
  );
}

function WorkspaceRepository({ root }: { root: string }) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [remote, setRemote] = useState('');
  const [credential, setCredential] = useState('public');
  const query = useQuery({
    queryKey: ['github-state', root],
    queryFn: () => repositoryApi<State>(root),
    enabled: !!root,
  });
  const binding = query.data?.binding;
  const remotes = query.data?.remotes ?? [];
  const selected = remotes.find(r => r.name === remote) ?? remotes[0];
  const change = useMutation({
    mutationFn: async (disconnect: boolean) => {
      if (disconnect) return repositoryApi(root, '', {}, { method: 'DELETE' });
      if (!selected) throw new Error(t('repoReview.noRemote'));
      return repositoryApi(root, '', {}, jsonRequest('PUT', { ...selected, credential }));
    },
    onSuccess: async () => {
      setParams({ root });
      await cache.invalidateQueries({ queryKey: ['github-state', root] });
    },
  });
  const number = Number(params.get('pr'));
  return (
    <Page bodyScroll="auto">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        <ScreenBody width="narrow" padded={false}>
          {(!binding || !number) && (
            <ScreenHeader
              title={binding?.repo ?? t('repoReview.connectTitle')}
              subtitle={folderBasename(root)}
              actions={
                binding && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={change.isPending}
                    onClick={() => change.mutate(true)}>
                    {t('repoReview.disconnect')}
                  </Button>
                )
              }
            />
          )}
          {(!root || query.error || change.error) && (
            <InlineNotice variant="error" role="alert">
              {query.error?.message ?? change.error?.message ?? t('repoReview.selectWorkspace')}
            </InlineNotice>
          )}
          {root && query.isPending && <Spinner size="sm" />}
          {query.data && !binding && (
            <>
              <P variant="muted">
                {t(remotes.length ? 'repoReview.attachHint' : 'repoReview.noRemote')}
              </P>
              {selected && (
                <Form
                  variant="surface"
                  onSubmit={e => {
                    e.preventDefault();
                    change.mutate(false);
                  }}
                  actions={
                    <Button variant="primary" type="submit" disabled={change.isPending}>
                      {t('github.connect_action')}
                    </Button>
                  }>
                  <FormField label={t('repoReview.remote')}>
                    <Select
                      value={selected.name}
                      onChange={e => setRemote(e.target.value)}
                      options={remotes.map(r => ({
                        value: r.name,
                        label: r.name + ' · ' + r.repo,
                      }))}
                    />
                  </FormField>
                  <FormField label={t('repoReview.credential')}>
                    <Select
                      value={credential}
                      onChange={e => setCredential(e.target.value)}
                      options={[
                        { value: 'public', label: t('repoReview.public') },
                        { value: 'cli', label: t('repoReview.cli') },
                        { value: 'env', label: t('repoReview.env') },
                      ]}
                    />
                  </FormField>
                </Form>
              )}
            </>
          )}
          {binding &&
            (number > 0 ? (
              <PullReview
                key={binding.id + '-' + number}
                root={root}
                binding={binding}
                number={number}
                back={() => setParams({ root })}
              />
            ) : (
              <>
                <P variant="muted">
                  {binding.name} · {t('repoReview.attached')}
                </P>
                <PullList
                  key={binding.id}
                  root={root}
                  binding={binding}
                  branch={query.data?.branch}
                  open={n => setParams({ root, pr: String(n) })}
                />
              </>
            ))}
          {root && !number && <HostedReceiver root={root} />}
        </ScreenBody>
      </Container>
    </Page>
  );
}
export default function RepositoryPage() {
  const [params] = useSearchParams();
  const root = params.get('root') ?? '';
  return <WorkspaceRepository key={root} root={root} />;
}
