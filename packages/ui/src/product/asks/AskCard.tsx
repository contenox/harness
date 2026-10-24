import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Collapsible } from '../../components/Collapsible';
import { P, Small } from '../../components/Typography';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TextAreaField } from '../../components/forms/Fields';
import { ScreenError } from '../saas/ScreenState';
import { useProductPorts } from '../ports';
import type { AnswerAskRequest, Ask, Instance } from '../lib/api/types';
import {
  approverRoleLabel,
  askHeadline,
  askKind,
  askMachineName,
  outcomeIsRefusal,
  outcomeSentence,
  quorum,
  type AskKind,
  type AskOutcome,
} from '../lib/asks';
import { formatDateTime } from '../lib/relativeTime';

export function AskCard({
  ask,
  outcome,
  instances,
  onAnswer,
  pending,
  error,
  here,
  block,
}: {
  ask: Ask;

  outcome?: AskOutcome;

  instances: Instance[] | undefined;
  onAnswer: (body: AnswerAskRequest) => void;
  pending?: boolean;
  error?: unknown;

  here?: 'agent' | 'host';

  block?: string | null;
}) {
  const [answer, setAnswer] = useState('');
  const [guidance, setGuidance] = useState('');
  const kind = askKind(ask);
  const pair = quorum(ask);
  const closed = outcome !== undefined;
  const standing =
    block === undefined || block === null || block.trim() === '' ? null : block.trim();

  return (
    <Card
      role="group"
      aria-label={`Ask: ${askHeadline(ask)}`}
      variant="filled"
      statusBorder={statusBorderFor(outcome)}
      className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge ask={ask} outcome={outcome} blocked={standing !== null} />
          {pair !== null && (
            <Badge variant="primary" size="sm">
              {pair.recorded} of {pair.required} approved
            </Badge>
          )}
        </div>


        <P className="max-h-40 overflow-y-auto overscroll-contain text-base leading-snug font-medium break-words">
          {askHeadline(ask)}
        </P>
      </div>


      <div className="flex flex-col gap-1">
        <Provenance ask={ask} instances={instances} here={here} />
        <Rule ask={ask} kind={kind} />
        <Silence ask={ask} closed={closed} />
        {pair !== null && <PairReview ask={ask} pair={pair} closed={closed} />}
      </div>

      {closed ? (
        <Outcome outcome={outcome} />
      ) : !ask.may_answer ? (
        <Restricted ask={ask} />
      ) : standing !== null ? (
        <Standing reason={standing} />
      ) : (
        <>
          {kind === 'question' ? (
            <TextAreaField
              label="Your answer"
              value={answer}
              onChange={event => setAnswer(event.target.value)}
              disabled={pending}
              rows={3}
              placeholder="What should the agent do?"
            />
          ) : (
            <Collapsible title="Add a note for the agent">
              <div className="pt-3">
                <TextAreaField
                  label="Note"
                  value={guidance}
                  onChange={event => setGuidance(event.target.value)}
                  disabled={pending}
                  rows={2}
                  placeholder="Why, or what to do instead."
                />
              </div>
            </Collapsible>
          )}

          {error !== undefined && error !== null && <ScreenError error={error} />}


          <div className="border-surface-200 dark:border-dark-surface-500 flex flex-col gap-2 border-t pt-3">
            {kind === 'question' ? (
              <>
                <Button
                  variant="primary"
                  disabled={pending || answer.trim() === ''}
                  onClick={() => onAnswer({ decision: 'answer', answer: answer.trim() })}>
                  Send this answer
                </Button>

                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() => onAnswer(withGuidance({ decision: 'deny' }, answer))}>
                  Refuse
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() => onAnswer(withGuidance({ decision: 'allow' }, guidance))}>
                  {pair === null ? 'Allow' : 'Approve'}
                </Button>
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() => onAnswer(withGuidance({ decision: 'deny' }, guidance))}>
                  Deny
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}


function withGuidance(body: AnswerAskRequest, guidance: string): AnswerAskRequest {
  const trimmed = guidance.trim();
  return trimmed === '' ? body : { ...body, guidance: trimmed };
}


function statusBorderFor(outcome: AskOutcome | undefined): 'warning' | 'success' | 'error' {
  if (outcome === undefined) return 'warning';
  return outcomeIsRefusal(outcome) ? 'error' : 'success';
}


function StateBadge({
  ask,
  outcome,
  blocked,
}: {
  ask: Ask;
  outcome: AskOutcome | undefined;
  blocked: boolean;
}) {
  if (outcome !== undefined) {
    return (
      <Badge variant={outcomeIsRefusal(outcome) ? 'error' : 'success'} size="sm">
        Closed
      </Badge>
    );
  }
  if (!ask.may_answer) {
    return (
      <Badge variant="default" size="sm">
        Not yours to answer
      </Badge>
    );
  }
  if (blocked) {
    return (
      <Badge variant="default" size="sm">
        Answers paused
      </Badge>
    );
  }
  if (ask.answered_by_caller) {
    return (
      <Badge variant="primary" size="sm">
        You answered
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size="sm">
      Waiting for you
    </Badge>
  );
}


function Provenance({
  ask,
  instances,
  here,
}: {
  ask: Ask;
  instances: Instance[] | undefined;
  here: 'agent' | 'host' | undefined;
}) {
  const { routes } = useProductPorts();
  const agent = (ask.agent_name ?? '').trim();
  const machine = askMachineName(ask.instance_id, instances);
  return (
    <Small className="text-text dark:text-dark-text">
      {agent === '' || here === 'agent' ? (
        agent === '' ? (
          'An agent'
        ) : (
          agent
        )
      ) : (
        <ProvenanceLink to={routes.askAgent(agent)} label={`Everything from ${agent}`}>
          {agent}
        </ProvenanceLink>
      )}{' '}
      on{' '}
      {here === 'host' ? (
        machine
      ) : (
        <ProvenanceLink to={routes.askHost(ask.instance_id)} label={`Everything on ${machine}`}>
          {machine}
        </ProvenanceLink>
      )}
    </Small>
  );
}


function ProvenanceLink({ to, label, children }: { to: string; label: string; children: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="text-primary-700 dark:text-dark-primary-500 inline underline underline-offset-4">
      {children}
    </Link>
  );
}


function Rule({ ask, kind }: { ask: Ask; kind: AskKind }) {
  if (kind === 'question') return null;
  const policy = (ask.policy_name ?? '').trim();
  const tool = (ask.tool_name ?? '').trim();
  if (policy === '' && tool === '') return null;
  return (
    <div className="border-surface-200 dark:border-dark-surface-500 flex flex-col border-l-2 pl-3">
      {tool !== '' && (
        <Small className="text-text-muted dark:text-dark-text-muted">
          Action <span className="text-text dark:text-dark-text font-mono">{tool}</span>
          {(ask.tools_name ?? '') !== '' && <> from {ask.tools_name}</>}
        </Small>
      )}
      {policy !== '' && (
        <Small className="text-text-muted dark:text-dark-text-muted">
          Stopped by <span className="text-text dark:text-dark-text">{policy}</span>
          {ask.matched_rule !== undefined && <>, rule #{ask.matched_rule}</>}
        </Small>
      )}
    </div>
  );
}


function Silence({ ask, closed }: { ask: Ask; closed: boolean }) {
  if (closed) return null;
  const expires = (ask.expires_at ?? '').trim();
  if (expires === '') return null;
  return (
    <Small className="text-text-warning dark:text-dark-text-warning">
      If nobody answers by {formatDateTime(expires)}, it is refused.
    </Small>
  );
}


function PairReview({
  ask,
  pair,
  closed,
}: {
  ask: Ask;
  pair: { required: number; recorded: number };
  closed: boolean;
}) {
  if (closed) return null;
  const remaining = pair.required - pair.recorded;
  return (
    <Small className="text-text dark:text-dark-text">
      {ask.answered_by_caller
        ? `You have approved this. It needs ${remaining} more ${remaining === 1 ? 'person' : 'people'}.`
        : `This needs ${pair.required} people. ${approvedSoFar(pair.recorded)}`}
    </Small>
  );
}


function approvedSoFar(recorded: number): string {
  if (recorded === 0) return 'Nobody has approved it yet.';
  return recorded === 1 ? '1 person has approved it.' : `${recorded} people have approved it.`;
}


function Restricted({ ask }: { ask: Ask }) {
  const role = (ask.approver_role ?? '').trim();
  return (
    <div className="border-surface-200 dark:border-dark-surface-500 border-t pt-4">
      <Small className="text-text-muted dark:text-dark-text-muted">
        {role === ''
          ? 'You cannot answer this one.'
          : `Only ${approverRoleLabel(role)} of this account can answer this.`}
      </Small>
    </div>
  );
}


function Standing({ reason }: { reason: string }) {
  return (
    <div
      role="status"
      className="border-surface-200 dark:border-dark-surface-500 flex flex-col gap-2 border-t pt-4">
      <Small className="text-text-warning dark:text-dark-text-warning">{reason}</Small>

      <Small className="text-text-muted dark:text-dark-text-muted">
        Nothing has been sent to the machine. The ask is still open on it.
      </Small>
    </div>
  );
}


function Outcome({ outcome }: { outcome: AskOutcome }) {
  const refusal = outcomeIsRefusal(outcome);
  return (
    <div role="status" className="border-surface-200 dark:border-dark-surface-500 border-t pt-4">
      <P
        className={`text-sm font-medium ${
          refusal
            ? 'text-text-error dark:text-dark-text-error'
            : 'text-text-success dark:text-dark-text-success'
        }`}>
        {outcomeSentence(outcome)}
      </P>
    </div>
  );
}
