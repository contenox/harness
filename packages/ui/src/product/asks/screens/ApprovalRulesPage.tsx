import { Button, Card, InlineNotice, P, Page, Small } from '@contenox/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AskSection } from '@contenox/ui';
import { SectionForm, SelectField, TextField } from '@contenox/ui';
import { ScreenError, ScreenLoading } from '../../saas/ScreenState';
import { ScreenBody } from '@contenox/ui';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';
import { useProductPorts } from '../../ports';
import type { SetApprovalRuleRequest } from '../../lib/api/types';
import {
  ALL_AGENTS_RULE,
  APPROVER_ROLE_CHOICES,
  defaultRule,
  effectiveRule,
  ruleAgentName,
  ruleAgentNameRefusal,
  ruleSentence,
  ruleSet,
  ruleSourceSentence,
  ruledAgents,
  type EffectiveRule,
  type RuleSet,
} from '../../lib/approvalRules';
import { agentCatalogue } from '../../lib/askAgents';
import { partitionFormError } from '../../saas/account/lib/formErrors';


const FIELDS = ['agent_name', 'approvals_required', 'approver_role'] as const;


const INHERIT = 'inherit';

/**
 * How many people an agent's asks need, and which role counts as a person.
 */
export default function ApprovalRulesPage() {
  const { routes, useApprovalRules, useAskBoard, useAskSubscriptions, useAuth, useConsumers } =
    useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const rules = useApprovalRules(accountID);
  const subscriptions = useAskSubscriptions(accountID);
  const consumers = useConsumers(accountID);
  const { board } = useAskBoard();
  const [named, setNamed] = useState<string[]>([]);

  const set =
    rules.data === undefined ? null : ruleSet(rules.data.rules, rules.data.max_approvals_required);
  const catalogue = agentCatalogue({
    board,
    subscriptions: subscriptions.data,
    consumers: consumers.data,
  }).map(agent => agent.name);
  const agents =
    set === null
      ? []
      : [...new Set([...ruledAgents(set), ...catalogue, ...named])].sort((a, b) =>
          a.localeCompare(b),
        );

  return (
    <Page header={<ScreenHeader title="Approval rules" />}>
      <ScreenBody width="narrow">
        <BackTo to={routes.asks} label="Asks" />
        <Small>
          An ask reaches everyone subscribed to the agent. This decides how many of them have to
          agree before the machine is told, and which role counts. Changing a rule needs an owner or
          an admin.
        </Small>

        {rules.isPending && <ScreenLoading label="Loading the approval rules" />}
        {rules.error !== null && rules.error !== undefined && (
          <ScreenError
            error={rules.error}
            onRetry={() => void rules.refetch()}
            retrying={rules.isFetching}
          />
        )}

        {set !== null && (
          <>
            <DefaultRuleForm set={set} />

            <AskSection title="Agents on this team">
              {agents.length === 0 ? (
                <Small className="text-text-muted dark:text-dark-text-muted">
                  No agent has been named yet, so every ask on this team follows the rule above.
                  Name one below to give it a stricter one.
                </Small>
              ) : (
                agents.map(agent => <AgentRuleForm key={agent} agent={agent} set={set} />)
              )}
              {/* Said once, under the list, because it is a property of every
                  row above rather than of any one of them. The relay's rule is
                  keyed (account, agent name) and carries no machine. */}
              <InlineNotice variant="info">
                A rule names an agent, not a machine — it covers that name on every machine this
                team owns.
              </InlineNotice>
            </AskSection>

            <NameAnAgent
              known={agents}
              onName={agent => setNamed(current => [...current, agent])}
            />
          </>
        )}
      </ScreenBody>
    </Page>
  );
}


function DefaultRuleForm({ set }: { set: RuleSet }) {
  const rule = defaultRule(set);
  return (
    <RuleForm
      title="Every agent on this team"
      agent={ALL_AGENTS_RULE}
      rule={rule}
      max={set.max}
      inherit={null}
      note={
        <Small className="text-text-muted dark:text-dark-text-muted">
          {/* NOT [ruleSourceSentence]. Its `default` arm says "inherited from
              the team default", which is the sentence a per-agent row needs and
              a nonsense on the default itself — the two contexts read the same
              `source` value and mean opposite things by it. */}
          {rule.source === 'built-in'
            ? 'Nothing is set, so the built-in rule applies. '
            : 'This is what an agent needs unless it has a rule of its own. '}
          Agents with a rule of their own are not affected by this one.
        </Small>
      }
    />
  );
}


function AgentRuleForm({ agent, set }: { agent: string; set: RuleSet }) {
  const { routes } = useProductPorts();
  const rule = effectiveRule(set, agent);
  return (
    <RuleForm
      title={agent}
      agent={agent}
      rule={rule}
      max={set.max}
      inherit={defaultRule(set)}
      note={
        <div className="flex flex-col gap-1">
          <Small className="text-text dark:text-dark-text">{ruleSentence(rule)}</Small>
          <Small className="text-text-muted dark:text-dark-text-muted">
            {ruleSourceSentence(rule.source)}
          </Small>
          <P className="text-sm">
            <Link
              to={routes.askAgent(agent)}
              aria-label={`Everything from ${agent}`}
              className="text-primary-700 dark:text-dark-primary-500 inline underline underline-offset-4">
              What it is waiting on
            </Link>
          </P>
        </div>
      }
    />
  );
}


function RuleForm({
  title,
  agent,
  rule,
  max,
  inherit,
  note,
}: {
  title: string;
  agent: string;
  rule: EffectiveRule;
  max: number;

  inherit: EffectiveRule | null;
  note: ReactNode;
}) {
  const { useAuth, useSetApprovalRule } = useProductPorts();
  const accountID = useAuth().accountID ?? '';
  const save = useSetApprovalRule(accountID);
  const inherited = inherit !== null && rule.source !== 'agent';
  const [count, setCount] = useState<string>(inherited ? INHERIT : String(rule.approvalsRequired));
  const [role, setRole] = useState<string>(rule.approverRole);





  useEffect(() => {
    setCount(inherited ? INHERIT : String(rule.approvalsRequired));
    setRole(rule.approverRole);
  }, [inherited, rule.approvalsRequired, rule.approverRole]);

  const errors = partitionFormError(save.error, FIELDS);
  const inheriting = count === INHERIT;
  const unchanged =
    inheriting === inherited &&
    (inheriting || Number(count) === rule.approvalsRequired) &&
    (inheriting || role === rule.approverRole);

  const submit = () => {
    const body: SetApprovalRuleRequest = inheriting
      ? { agent_name: agent, unset: true }
      : { agent_name: agent, approvals_required: Number(count) };
    if (!inheriting && role !== '') body.approver_role = role;
    save.mutate(body);
  };

  return (

    <section aria-label={title}>
      <SectionForm
        title={title}
        submitLabel="Save this rule"
        errors={errors}
        pending={save.isPending}
        canSubmit={!unchanged}
        onSubmit={submit}
        note={
          <>
            {note}
            {save.isSuccess && (
              <InlineNotice variant="info" role="status">
                Saved.
              </InlineNotice>
            )}
          </>
        }>
        <SelectField
          label="People who must approve"
          value={count}
          onChange={event => setCount(event.target.value)}
          disabled={save.isPending}
          options={countOptions(max, inherit)}
          error={errors.fields.approvals_required}
        />
        <SelectField
          label="Who may approve"
          value={role}
          onChange={event => setRole(event.target.value)}

          disabled={save.isPending || inheriting}
          options={APPROVER_ROLE_CHOICES}
          error={errors.fields.approver_role}
        />
        {errors.fields.agent_name !== undefined && (
          <Small className="text-text-error dark:text-dark-text-error">
            {errors.fields.agent_name}
          </Small>
        )}
      </SectionForm>
    </section>
  );
}


function countOptions(max: number, inherit: EffectiveRule | null) {
  const counts = Array.from({ length: max }, (_, index) => ({
    value: String(index + 1),
    label: index === 0 ? '1 person' : `${index + 1} different people`,
  }));
  if (inherit === null) return counts;
  return [
    {
      value: INHERIT,
      label: `Same as the team default (${inherit.approvalsRequired === 1 ? '1 person' : `${inherit.approvalsRequired} people`})`,
    },
    ...counts,
  ];
}


function NameAnAgent({ known, onName }: { known: string[]; onName: (agent: string) => void }) {
  const [name, setName] = useState('');
  const typed = ruleAgentName(name);
  const refusal = ruleAgentNameRefusal(name);
  const alreadyListed = typed !== null && known.includes(typed);

  return (
    <Card variant="filled" className="flex flex-col gap-3">
      <TextField
        label="Agent name"
        value={name}
        onChange={event => setName(event.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        error={refusal ?? undefined}
        hint="As declared on the machine."
      />
      <Small className="text-text-muted dark:text-dark-text-muted">
        There is no list to pick from: agents are declared on your own machines and the relay never
        sees the declaration. A rule can be set before the agent has ever asked for anything, which
        is the point of setting one.
      </Small>
      {alreadyListed && <Small>That agent is already listed above.</Small>}
      <Button
        variant="primary"
        disabled={typed === null || alreadyListed}
        onClick={() => {
          if (typed === null) return;
          onName(typed);
          setName('');
        }}>
        Give this agent a rule
      </Button>
    </Card>
  );
}
