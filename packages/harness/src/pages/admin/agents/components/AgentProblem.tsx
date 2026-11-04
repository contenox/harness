import { CodeBlock, Disclosure, InlineNotice } from '@contenox/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { problemKey } from '../../../../lib/externalAgentStatus';
import type { ExternalAgentProblem } from '../../../../lib/types';

type Props = {
  problem: ExternalAgentProblem;
  action?: ReactNode;
};

export function AgentProblem({ problem, action }: Props) {
  const { t } = useTranslation();
  return (
    <InlineNotice variant="error" role="alert" className="flex flex-col gap-2">
      <span>{t(problemKey(problem.kind))}</span>
      {problem.detail && (
        <Disclosure label={t('external_agents.details')}>
          <CodeBlock>{problem.detail}</CodeBlock>
        </Disclosure>
      )}
      {action && <div>{action}</div>}
    </InlineNotice>
  );
}
