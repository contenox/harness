import { Button, CodeBlock, Disclosure, InlineNotice, KeyValue, P, StatusDot } from '@contenox/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { connectorDot, connectorSummaryKey } from '../../lib/connectorStatus';
import type { Connector } from '../../lib/connectorTypes';

type Props = {
  connector: Connector;
  checking: boolean;
  checkError?: string;
  signingIn?: boolean;
  signInError?: string;
  onCheck: () => void;
  onSignIn?: () => void;
  extra?: ReactNode;
};

export function ConnectorDetails({
  connector,
  checking,
  checkError,
  signingIn,
  signInError,
  onCheck,
  onSignIn,
  extra,
}: Props) {
  const { t } = useTranslation();
  const count = connector.tools.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusDot
          status={connectorDot(connector, checking)}
          label={
            checking
              ? t('connectors.status.checking')
              : connector.status === 'ready'
                ? t('connectors.status.ready_count', { count })
                : t(connectorSummaryKey(connector))
          }
        />
        <div className="flex gap-2">
          {connector.status === 'needs_sign_in' && onSignIn && (
            <Button type="button" size="sm" isLoading={signingIn} onClick={onSignIn}>
              {t('connectors.sign_in')}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" isLoading={checking} onClick={onCheck}>
            {t('connectors.check_again')}
          </Button>
        </div>
      </div>

      {connector.workspace && (
        <KeyValue
          label={t('connectors.works_in')}
          value={<span className="font-mono text-xs">{connector.workspace}</span>}
        />
      )}

      {connector.status === 'needs_sign_in' && (
        <InlineNotice variant="warning">{t('connectors.needs_sign_in_hint')}</InlineNotice>
      )}
      {connector.status === 'unavailable' && (
        <InlineNotice variant="error" role="alert" className="flex flex-col gap-2">
          <span>{t('connectors.unavailable_hint')}</span>
          {connector.problem && (
            <Disclosure label={t('connectors.details')}>
              <CodeBlock>{connector.problem}</CodeBlock>
            </Disclosure>
          )}
        </InlineNotice>
      )}
      {(checkError || signInError) && (
        <InlineNotice variant="error" role="alert">
          {checkError || signInError}
        </InlineNotice>
      )}

      {extra}
      {!extra && count > 0 && (
        <Disclosure label={t('connectors.tools_count', { count })} defaultOpen={count <= 8}>
          <div className="flex flex-col gap-1">
            {connector.tools.map(tool => (
              <KeyValue
                key={tool.name}
                label={tool.name}
                value={tool.description ?? ''}
                labelClassName="font-mono text-xs"
                valueClassName="text-text-muted whitespace-normal"
              />
            ))}
          </div>
        </Disclosure>
      )}
      {connector.status === 'ready' && count === 0 && (
        <P variant="muted" className="text-sm">
          {t('connectors.no_tools')}
        </P>
      )}
    </div>
  );
}
