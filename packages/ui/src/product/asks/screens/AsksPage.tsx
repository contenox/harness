import { Page } from '@contenox/ui';
import { SlidersHorizontal, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AskInbox } from '../AskInbox';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { useProductPorts } from '../../ports';

/**
 * The inbox: every agent on this team that has stopped and is waiting for a person.
 */
export default function AsksPage() {
  const { routes, useAuth } = useProductPorts();
  const accountID = useAuth().accountID ?? '';

  return (
    <Page
      header={
        <ScreenHeader
          title="Asks"
          actions={

            <>
              <Link
                to={routes.approvalRules}
                aria-label="See who has to approve"
                className="text-text-muted dark:text-dark-text-muted flex items-center gap-2 rounded-lg p-2 text-sm">
                <UserCheck className="h-5 w-5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Who approves</span>
              </Link>
              <Link
                to={routes.askSubscriptions}
                aria-label="Choose which agents ask you"
                className="text-text-muted dark:text-dark-text-muted flex items-center gap-2 rounded-lg p-2 text-sm">
                <SlidersHorizontal className="h-5 w-5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Which agents</span>
              </Link>
            </>
          }
        />
      }>
      <ScreenBody>
        <AskInbox accountID={accountID} />
      </ScreenBody>
    </Page>
  );
}
