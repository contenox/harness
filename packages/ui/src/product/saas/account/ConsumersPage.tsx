import { Button, Card, EmptyState, InlineNotice, P, Page, Small } from '@contenox/ui';
import { Webhook } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../ConfirmDialog';
import { CopyRow, InlineCode } from '@contenox/ui';
import { SectionForm, SelectField, TextField } from '@contenox/ui';
import { RefusalCta } from '../RefusalCta';
import { ListSkeleton, ScreenError } from '../ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type {
  ConsumerSessionMode,
  ConsumerSource,
  ConsumerTargetKind,
  CreateConsumerResponse,
  EventConsumer,
  Instance,
} from '../../lib/api/types';
import {
  ingestSummary,
  receiverLabel,
  receiverOptions,
  sessionModeLabel,
  sessionSentence,
  sourceLabel,
  targetNameRefusal,
  targetSentence,
} from './lib/consumers';
import { partitionFormError, type FormErrors } from './lib/formErrors';


const CONSUMER_FIELDS = [
  'name',
  'source',
  'allowed_origins',
  'instance_id',
  'chain',
  'agent_name',
  'session_mode',
  'session_name',
] as const;


const MODE_OPTIONS = (['new', 'reused'] as const).map(mode => ({
  value: mode,
  label: sessionModeLabel(mode),
}));


const TARGET_OPTIONS: { value: ConsumerTargetKind; label: string }[] = [
  { value: 'agent', label: 'An agent declared on that machine' },
  { value: 'chain', label: 'A chain file on that machine' },
];


const SOURCE_OPTIONS = (['generic', 'form'] as const).map(source => ({
  value: source,
  label: sourceLabel(source),
}));

/**
 * The account's event consumers: endpoints outside systems post events to, each running a chain on a paired machine.
 */
export default function ConsumersPage() {
  const { routes, useAuth, useConsumers, useHosts } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const consumers = useConsumers(accountID);
  const hosts = useHosts(accountID);

  return (
    <Page header={<ScreenHeader title="Event consumers" />}>
      <ScreenBody width="band">
        <BackTo to={routes.account} label="Account" />
        <CreateConsumerSection accountID={accountID} hosts={hosts.data} hostsError={hosts.error} />

        <Small>Your consumers</Small>
        {consumers.isPending && <ListSkeleton label="Loading your event consumers" />}
        {consumers.error && (
          <ScreenError
            error={consumers.error}
            onRetry={() => void consumers.refetch()}
            retrying={consumers.isFetching}
          />
        )}
        {consumers.data !== undefined && consumers.data.length > 0 && (
          <Small>
            A consumer&rsquo;s ingest URL and secret were shown once, when it was created. If they
            are lost, delete the consumer and create another.
          </Small>
        )}
        {consumers.data?.map(consumer => (
          <ConsumerCard
            key={consumer.id}
            consumer={consumer}
            accountID={accountID}
            instances={hosts.data}
          />
        ))}
        {consumers.data?.length === 0 && (
          <EmptyState
            icon={<Webhook aria-hidden />}
            title="Nothing listening yet"
            description="Your systems post events to an ingest URL, and the machine you choose runs a chain on each one. Create a consumer above and it will appear here."
          />
        )}
      </ScreenBody>
    </Page>
  );
}


function CreateConsumerSection({
  accountID,
  hosts,
  hostsError,
}: {
  accountID: string;
  hosts: Instance[] | undefined;
  hostsError: unknown;
}) {
  const { useCreateConsumer } = useProductPorts();
  const create = useCreateConsumer(accountID);
  const [created, setCreated] = useState<CreateConsumerResponse | null>(null);

  if (created !== null) {
    return (
      <CreatedConsumerPanel
        created={created}
        onDone={() => {
          setCreated(null);
          create.reset?.();
        }}
      />
    );
  }

  return (
    <CreateConsumerForm
      create={create}
      hosts={hosts}
      hostsError={hostsError}
      onCreated={setCreated}
    />
  );
}


const NO_FORM_ERRORS: FormErrors = { retryable: false, fields: {} };


function CreateConsumerForm({
  create,
  hosts,
  hostsError,
  onCreated,
}: {
  create: ReturnType<ReturnType<typeof useProductPorts>['useCreateConsumer']>;
  hosts: Instance[] | undefined;
  hostsError: unknown;
  onCreated: (created: CreateConsumerResponse) => void;
}) {
  const { routes, refusalSell } = useProductPorts();
  const [name, setName] = useState('');
  const [source, setSource] = useState<ConsumerSource>('generic');
  const [origin, setOrigin] = useState('');
  const [instanceID, setInstanceID] = useState('');
  const [targetKind, setTargetKind] = useState<ConsumerTargetKind>('agent');
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<ConsumerSessionMode>('new');
  const [sessionName, setSessionName] = useState('');

  const receivers = receiverOptions(hosts ?? []);
  const noReceivers = hosts !== undefined && receivers.length === 0;

  const sell = refusalSell(create.error);
  const errors = sell === null ? partitionFormError(create.error, CONSUMER_FIELDS) : NO_FORM_ERRORS;




  const needsSessionName = mode === 'reused';
  const targetRefusal = targetNameRefusal(target, targetKind === 'agent' ? 'agent' : 'session');
  const sessionRefusal = targetNameRefusal(sessionName, 'session');
  const canSubmit =
    name.trim() !== '' &&
    instanceID !== '' &&
    target.trim() !== '' &&
    targetRefusal === null &&
    sessionRefusal === null &&
    (!needsSessionName || sessionName.trim() !== '') &&
    (source !== 'form' || origin.trim() !== '');

  const submit = () => {
    if (!canSubmit) return;
    create.mutate(
      {
        name: name.trim(),
        source,


        ...(source === 'form' && { allowed_origins: [origin.trim()] }),
        instance_id: instanceID,




        ...(targetKind === 'agent' ? { agent_name: target.trim() } : { chain: target.trim() }),
        session_mode: mode,
        ...(needsSessionName && { session_name: sessionName.trim() }),
      },
      {
        onSuccess: response => {
          setName('');
          setTarget('');
          setSessionName('');
          onCreated(response);
        },
      },
    );
  };

  return (
    <SectionForm
      title="Create a consumer"
      submitLabel="Create consumer"
      errors={errors}
      pending={create.isPending}
      canSubmit={canSubmit}
      onSubmit={submit}
      note={<RefusalCta error={create.error} />}>
      <TextField
        label="Name"
        required
        value={name}
        onChange={event => setName(event.target.value)}
        disabled={create.isPending}
        error={errors.fields.name}
        hint="For telling consumers apart."
      />
      <SelectField
        label="Events arrive as"
        value={source}
        onChange={event => setSource(event.target.value as ConsumerSource)}
        disabled={create.isPending}
        options={SOURCE_OPTIONS}
        error={errors.fields.source}
      />
      {source === 'form' && (
        <>
          <TextField
            label="Origin"
            required
            value={origin}
            onChange={event => setOrigin(event.target.value)}
            disabled={create.isPending}
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="url"
            placeholder="https://example.com"
            error={errors.fields.allowed_origins}
          />
          <Small>Browser posts are accepted only from this origin.</Small>
        </>
      )}
      <SelectField
        label="Receiver"
        required
        value={instanceID}
        onChange={event => setInstanceID(event.target.value)}
        disabled={create.isPending || receivers.length === 0}
        options={[
          { value: '', label: hosts === undefined ? 'Loading machines' : 'Choose a machine' },
          ...receivers,
        ]}
        error={errors.fields.instance_id}
      />
      {hostsError !== null && hostsError !== undefined && <ScreenError error={hostsError} />}
      {noReceivers && (
        <Small>
          No machine can receive events yet. Pair one on{' '}
          <Link
            to={routes.hosts}
            className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
            Hosts
          </Link>{' '}
          first.
        </Small>
      )}
      <SelectField
        label="Runs"
        value={targetKind}
        onChange={event => setTargetKind(event.target.value as ConsumerTargetKind)}
        disabled={create.isPending}
        options={TARGET_OPTIONS}
      />
      {targetKind === 'agent' ? (
        <>
          <TextField
            label="Agent name"
            required
            value={target}
            onChange={event => setTarget(event.target.value)}
            disabled={create.isPending}
            autoCapitalize="none"
            autoCorrect="off"
            error={targetRefusal ?? errors.fields.agent_name}
            hint="As declared on the machine."
          />
          {/* Typed, not picked, and the reason is a property of the product
              rather than a gap in this screen: an agent is declared on the
              customer's own machine and the relay never learns the roster.
              There is no route to populate a picker from. */}
          <Small>
            Agents are declared on the machine itself and the relay never sees the list, so this is
            typed rather than chosen. The machine generates the chain from the declaration. It is
            also the name teammates subscribe to when this agent asks for a decision.
          </Small>
        </>
      ) : (
        <>
          <TextField
            label="Chain"
            required
            value={target}
            onChange={event => setTarget(event.target.value)}
            disabled={create.isPending}
            autoCapitalize="none"
            autoCorrect="off"
            error={targetRefusal ?? errors.fields.chain}
            hint="Names a chain on that machine."
          />
          <Small>
            A chain names no agent, so an ask it raises reaches only teammates subscribed to every
            agent.
          </Small>
        </>
      )}
      <SelectField
        label="Session mode"
        value={mode}
        onChange={event => setMode(event.target.value as ConsumerSessionMode)}
        disabled={create.isPending}
        options={MODE_OPTIONS}
        error={errors.fields.session_mode}
      />
      {needsSessionName && (
        <>
          <TextField
            label="Session name"
            required
            value={sessionName}
            onChange={event => setSessionName(event.target.value)}
            disabled={create.isPending}
            autoCapitalize="none"
            autoCorrect="off"
            error={sessionRefusal ?? errors.fields.session_name}
            hint="How the machine finds it again."
          />
          <Small>
            Every event lands in this one session, so the agent keeps what happened on the last one.
            The machine finds it by this name and starts it the first time.
          </Small>
        </>
      )}
      {source === 'generic' ? (
        <Small>
          Creating a consumer answers with its ingest URL and a signing secret. The secret is shown
          once, right after creation.
        </Small>
      ) : (
        <Small>
          Creating a consumer answers with its ingest URL. A form on the origin above posts to it
          directly — there is no secret.
        </Small>
      )}
    </SectionForm>
  );
}


function CreatedConsumerPanel({
  created,
  onDone,
}: {
  created: CreateConsumerResponse;
  onDone: () => void;
}) {
  return (
    <Card variant="filled" className="flex flex-col gap-4">
      <div>
        <P className="font-medium">{created.name} is ready</P>
        <Small>
          {targetSentence(created)} on the machine you chose. {sessionSentence(created)}.
        </Small>
      </div>

      <CopyRow label="Ingest URL" copyLabel="Copy the ingest URL" value={created.ingest_url} />
      {created.secret !== undefined && (
        <CopyRow label="Secret" copyLabel="Copy the secret" value={created.secret} />
      )}

      {created.secret !== undefined ? (
        <>
          <InlineNotice variant="info">
            Shown once. Only a digest is stored, so there is no way back to this URL or secret — if
            you lose them, delete this consumer and create another.
          </InlineNotice>

          <P className="text-sm">
            Your system POSTs each event to the ingest URL as a JSON body. Sign every request with
            the secret — HMAC-SHA256 over the raw request body — and send the hex digest in the{' '}
            <InlineCode>X-Contenox-Signature</InlineCode> header.
          </P>
        </>
      ) : (
        <>
          <InlineNotice variant="info">
            Shown once. Only a digest is stored, so there is no way back to this URL — if you lose
            it, delete this consumer and create another.
          </InlineNotice>

          <P className="text-sm">
            Point a form&rsquo;s <InlineCode>action</InlineCode> on{' '}
            <InlineCode>
              {created.allowed_origins?.join(', ') ?? 'the registered origin'}
            </InlineCode>{' '}
            at the ingest URL. Posts from any other origin are refused, and there is no secret to
            hold.
          </P>
        </>
      )}

      <Button variant="primary" onClick={onDone}>
        Done
      </Button>
    </Card>
  );
}


function ConsumerCard({
  consumer,
  accountID,
  instances,
}: {
  consumer: EventConsumer;
  accountID: string;
  instances: Instance[] | undefined;
}) {
  const { routes, useDeleteConsumer } = useProductPorts();
  const remove = useDeleteConsumer(accountID);
  const [confirming, setConfirming] = useState(false);

  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <div className="min-w-0">
        <P className="truncate font-medium">{consumer.name}</P>
        <Small>{ingestSummary(consumer)}</Small>
        <Small>
          {targetSentence(consumer)} on {receiverLabel(consumer.instance_id, instances)}
        </Small>
        <Small>{sessionSentence(consumer)}</Small>
        {/* The agent's own screen, from the thing that fires it. The consumer
            list is the one place in the app that knows an agent name before it
            has ever asked for anything. */}
        {(consumer.agent_name ?? '') !== '' && (
          <P className="text-sm">
            <Link
              to={routes.askAgent(consumer.agent_name!)}
              aria-label={`Everything from ${consumer.agent_name}`}
              className="text-primary-700 dark:text-dark-primary-500 inline underline underline-offset-4">
              What this agent is waiting on
            </Link>
          </P>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${consumer.name}?`}
        confirmLabel="Delete the consumer"
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(consumer.id, { onSuccess: () => setConfirming(false) })}>
        <P className="text-sm">
          Its ingest URL stops accepting immediately — anything your systems post there after this
          is refused, and no chain runs for those events.
        </P>
        <P className="text-sm">
          Sessions it already started keep running on their machine. Creating a consumer again
          issues a new URL and a new secret.
        </P>
      </ConfirmDialog>
    </Card>
  );
}
