import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Collapsible } from '../../../components/Collapsible';
import { DiffView, diffLinesFromTexts } from '../../../components/DiffView';
import { P, Small, Span } from '../../../components/Typography';
import type { PermissionOption, RequestPermissionRequest } from '@contenox/acp-client';
import {
  permissionEvidence,
  permissionMetaFrom,
  type PermissionArgument,
  type PermissionEvidence,
  type PermissionMeta,
} from '../lib/permissionRequest';
import { formatDateTime } from '../../lib/relativeTime';

/**
 * The agent is asking before it does something, and the turn is parked until this is answered.
 */
export function PermissionRequest({
  request,
  onRespond,
  disabled,
}: {
  request: RequestPermissionRequest;
  onRespond: (optionId: string) => void;
  disabled?: boolean;
}) {
  const { toolCall } = request;
  const meta = permissionMetaFrom(request);
  const evidence = permissionEvidence(toolCall);



  const argumentsOnFace = evidence.diffs.length === 0;

  return (





    <Card
      role="group"
      aria-label="Permission needed"
      variant="filled"
      statusBorder="warning"
      className="m-3 flex max-h-[42dvh] shrink-0 flex-col gap-3 p-4 sm:m-4 sm:p-5">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <Small>Permission needed</Small>
          {toolCall.kind !== undefined && (
            <Badge variant="warning" size="sm">
              {toolCall.kind}
            </Badge>
          )}
        </div>
        <P className="font-medium break-words">{toolCall.title ?? toolCall.toolCallId}</P>
        <Deadline meta={meta} />
      </div>

      {/*
        The one scrolling surface on this card. `min-h-0` is what lets it
        actually shrink inside the card's flex column — without it a tall diff
        sets the card's height and the buttons below leave the screen, which is
        the exact failure this card cannot have.

        ⚠ A BLOCK with `space-y-3`, NOT a flex column, and that is the whole
        point of the comment. As a flex column its children are flex items and
        shrink by default: a 400px diff was squeezed to 155px inside
        `DiffView`'s own `overflow-hidden` root, which cut it off mid-file with
        no scrollbar and no seam — the diff LOOKED complete and its last lines
        could not be reached by any gesture. A block box does not shrink its
        children, so the diff keeps its height and this container scrolls.
      */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
        {evidence.diffs.map((diff, index) => (
          <DiffView
            key={`${diff.path}-${index}`}
            filePath={diff.path}
            lines={diffLinesFromTexts(diff.oldText, diff.newText)}
          />
        ))}

        <Summary evidence={evidence} />
        {argumentsOnFace && <Arguments evidence={evidence} />}
        <Disclosure meta={meta} evidence={evidence} argumentsOnFace={argumentsOnFace} />
      </div>

      {/*
        The rule is not decoration. The evidence above is a window onto content
        taller than it, and on a phone there is no scrollbar to say so — the
        first render of this card ended a diff mid-line directly against the
        Allow button, and it read as a diff that was simply short. A seam
        between the region and the answer is what makes the cut legible as a
        cut.
      */}
      <div className="border-surface-200 dark:border-dark-surface-500 flex shrink-0 flex-col gap-2 border-t pt-3">
        {request.options.map((option: PermissionOption) => (
          <Button
            key={option.optionId}
            variant={variantFor(option)}
            disabled={disabled}
            onClick={() => onRespond(option.optionId)}>
            {option.name}
          </Button>
        ))}
      </div>
    </Card>
  );
}


function Deadline({ meta }: { meta: PermissionMeta }) {
  if (meta.expiresAt === '') return null;
  const grants = meta.onTimeout === 'allow';
  return (
    <>
      <Small>Expires {formatDateTime(meta.expiresAt)}</Small>
      {/*
        Its own line rather than a clause after the date. The two together are
        two lines on a 412px column either way, and as one sentence the wrap
        fell inside "denied if / unanswered" — so the consequence gets the line
        instead of the break.
      */}
      {meta.onTimeout !== '' && (
        <Small className={grants ? 'text-warning-700 dark:text-dark-warning-700' : undefined}>
          {capitalise(outcomeWord(meta.onTimeout))} if nobody answers
        </Small>
      )}
    </>
  );
}

function capitalise(word: string): string {
  return word === '' ? word : word[0].toUpperCase() + word.slice(1);
}


function outcomeWord(onTimeout: string): string {
  if (onTimeout === 'allow') return 'allowed';
  if (onTimeout === 'deny') return 'denied';
  return onTimeout;
}


function Summary({ evidence }: { evidence: PermissionEvidence }) {
  if (evidence.summary === '') return null;
  return (
    <div>
      <Small className="text-text-muted dark:text-dark-text-muted">Summary</Small>
      <pre className="bg-surface-100 dark:bg-dark-surface-300 text-text dark:text-dark-text mt-1 rounded p-2 font-mono text-xs break-all whitespace-pre-wrap">
        {evidence.summary}
      </pre>
      {!evidence.argumentsSent && (
        <Small className="mt-1 text-text-muted dark:text-dark-text-muted">
          This is the machine's own summary of the call. It did not send the arguments with this
          ask.
        </Small>
      )}
    </div>
  );
}


function Arguments({ evidence }: { evidence: PermissionEvidence }) {
  if (!evidence.argumentsSent) return null;
  return (
    <div>
      <Small className="text-text-muted dark:text-dark-text-muted">Called with</Small>
      {evidence.args.length === 0 ? (
        <Small className="mt-1">No arguments.</Small>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          {evidence.args.map((argument, index) => (
            <ArgumentValue key={argument.key === '' ? index : argument.key} argument={argument} />
          ))}
        </div>
      )}
      {evidence.hiddenArguments > 0 && (
        <Small className="mt-1 text-text-muted dark:text-dark-text-muted">
          and {evidence.hiddenArguments} more{' '}
          {evidence.hiddenArguments === 1 ? 'argument' : 'arguments'}, not shown
        </Small>
      )}
    </div>
  );
}


function ArgumentValue({ argument }: { argument: PermissionArgument }) {
  return (
    <div>
      {argument.key !== '' && (
        <Span variant="muted" className="font-mono text-xs">
          {argument.key}
        </Span>
      )}
      <pre className="bg-surface-100 dark:bg-dark-surface-300 text-text dark:text-dark-text rounded p-2 font-mono text-xs break-all whitespace-pre-wrap">
        {argument.value}
      </pre>
      {argument.hiddenLines > 0 && (
        <Small className="text-text-muted dark:text-dark-text-muted">
          … {argument.hiddenLines} more {argument.hiddenLines === 1 ? 'line' : 'lines'}, not shown
        </Small>
      )}
    </div>
  );
}


function Disclosure({
  meta,
  evidence,
  argumentsOnFace,
}: {
  meta: PermissionMeta;
  evidence: PermissionEvidence;
  argumentsOnFace: boolean;
}) {
  const hiddenArguments = !argumentsOnFace && evidence.argumentsSent;
  const hasPolicy =
    meta.policyName !== '' ||
    meta.matchedRule !== null ||
    meta.detail !== '' ||
    meta.mayCall.length > 0;
  const hasRecovery = meta.recoveryCommand !== '' || meta.askId !== '';
  if (!hasPolicy && !hasRecovery && !hiddenArguments) return null;

  return (
    <Collapsible title="Why this stopped">
      <div className="flex flex-col gap-3 pt-3">
        {meta.policyName !== '' && (
          <DetailRow label="Policy" value={meta.policyName} note={meta.policyPath} />
        )}
        {/*
          Only a real index is rendered. An absent `matchedRule` means the
          policy default applied OR that no envelope arrived at all, and this
          side cannot tell those apart — so it says nothing rather than
          attributing the stop to a rule that may not exist.
        */}
        {meta.matchedRule !== null && (
          <DetailRow label="Matched rule" value={`#${meta.matchedRule}`} note={meta.detail} />
        )}
        {meta.mayCall.length > 0 && <MayCall meta={meta} />}
        {hiddenArguments && <Arguments evidence={evidence} />}
        {hasRecovery && <Recovery meta={meta} />}
      </div>
    </Collapsible>
  );
}


function MayCall({ meta }: { meta: PermissionMeta }) {
  return (
    <div>
      <Small className="text-text-muted dark:text-dark-text-muted">Declared reach</Small>
      <ul className="mt-1 flex flex-col gap-0.5">
        {meta.mayCall.map(entry => (
          <li key={entry} className="text-text dark:text-dark-text font-mono text-xs break-all">
            {entry}
          </li>
        ))}
      </ul>
      {meta.mayCallDeclared === false && (
        <Small className="text-warning-700 dark:text-dark-warning-700 mt-1">
          The call declares it can reach others it did not name.
        </Small>
      )}
    </div>
  );
}


function Recovery({ meta }: { meta: PermissionMeta }) {
  return (
    <div>
      <Small className="text-text-muted dark:text-dark-text-muted">
        {meta.recoveryCommand === '' ? 'Ask' : 'Answer from a terminal'}
      </Small>
      {meta.recoveryCommand === '' ? (
        <Small className="font-mono text-xs break-all">{meta.askId}</Small>
      ) : (
        <pre className="bg-surface-100 dark:bg-dark-surface-300 text-text dark:text-dark-text mt-1 rounded p-2 font-mono text-xs break-all whitespace-pre-wrap">
          {meta.recoveryCommand}
        </pre>
      )}
    </div>
  );
}


function DetailRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <Small className="text-text-muted dark:text-dark-text-muted">{label}</Small>
      <Small className="break-all">{value}</Small>
      {note !== undefined && note !== '' && (
        <Small className="text-text-muted dark:text-dark-text-muted text-xs break-all">
          {note}
        </Small>
      )}
    </div>
  );
}


function variantFor(option: PermissionOption): 'primary' | 'danger' | 'outline' {
  switch (option.kind) {
    case 'allow_once':
    case 'allow_always':
      return 'primary';
    case 'reject_once':
    case 'reject_always':
      return 'danger';
    default:
      return 'outline';
  }
}
