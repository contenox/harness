import { InlineNotice, Page } from '@contenox/ui';
import type { ReactNode } from 'react';
import { ScreenLoading } from '../saas/ScreenState';
import { ScreenHeader } from '../shell/ScreenHeader';

export function AttachedSessionLayout({
  title,
  actions,
  state,
  connection,
  children,
}: {
  title: string;
  actions: ReactNode;
  state: 'blocked' | 'not_found' | 'loading' | 'ready';
  connection: ReactNode;
  children: ReactNode;
}) {
  return (
    <Page bodyScroll="hidden" header={<ScreenHeader title={title} actions={actions} />}>
      {state === 'blocked' ? (
        <div className="p-4">{connection}</div>
      ) : state === 'not_found' ? (
        <div className="p-4">
          <InlineNotice variant="error" role="alert">
            That session is not on this machine any more.
          </InlineNotice>
        </div>
      ) : state === 'loading' ? (
        <ScreenLoading label="Opening the session" />
      ) : (
        children
      )}
    </Page>
  );
}
