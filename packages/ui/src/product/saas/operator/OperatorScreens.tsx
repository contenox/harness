import { Button, Card, CheckboxField, InlineNotice, KeyValue, ListCard, Page, ScreenBody, Small, TextField } from '@contenox/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductMutation, ProductQuery } from '../../ports';
import { ScreenError, ScreenLoading } from '../ScreenState';
import { ScreenHeader } from '../../shell/ScreenHeader';
import { BackTo } from '../../shell/BackTo';

/**
 * A role as the console lists and edits it.
 */
export interface OperatorRole {
  name: string;
  description?: string;
  deny?: boolean;
  grant: { allowances?: Record<string, number>; capabilities?: string[] };
  expiresAt?: string;
}

/**
 * One grant of a role to an account.
 */
export interface OperatorRoleAssignment {
  id: string;
  accountID: string;
  role: string;
  source: string;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

/**
 * What an operator states a role to be.
 */
export interface RoleDraft {
  description: string;
  deny: boolean;
  allowances: Record<string, number>;
  capabilities: string[];
}


const SEATS = 'seats';

/**
 * The operator console: what each role confers, who holds it, and the two ways to change that.
 */
export function OperatorRolesScreen({
  roles,
  define,
}: {
  roles: ProductQuery<OperatorRole[]>;
  define: ProductMutation<{ name: string } & RoleDraft, OperatorRole>;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('4');
  const [capabilities, setCapabilities] = useState('');
  const canCreate = name.trim() !== '' && seats.trim() !== '';

  return (
    <Page header={<ScreenHeader title="Roles" />}>
      <ScreenBody width="band">
        <Card variant="filled" className="flex flex-col gap-3">
          <Small>
            A role is what an account holds and what holding it confers. Changing a role changes every
            account that holds it, on their next request — there is nothing to re-assign.
          </Small>
          <TextField label="New role name" value={name} onChange={event => setName(event.target.value)} />
          <TextField label="Seats" value={seats} onChange={event => setSeats(event.target.value)} />
          <TextField
            label="Capabilities"
            hint="comma separated"
            value={capabilities}
            onChange={event => setCapabilities(event.target.value)}
          />
          <Button
            disabled={!canCreate || define.isPending}
            isLoading={define.isPending}
            onClick={() =>
              define.mutate({ name: name.trim(), ...draftFromFields(name.trim(), '', false, seats, capabilities) }, {
                onSuccess: () => {
                  setName('');
                  setCapabilities('');
                },
              })
            }>
            Create role
          </Button>
          {define.error && <ScreenError error={define.error} />}
        </Card>

        {roles.isPending && <ScreenLoading label="Loading roles" />}
        {roles.error && <ScreenError error={roles.error} onRetry={() => void roles.refetch()} retrying={roles.isFetching} />}
        {(roles.data ?? []).map(role => (
          <ListCard
            key={role.name}
            title={role.name}
            meta={
              <Small>
                {role.deny
                  ? 'withholds access'
                  : `${role.grant.allowances?.[SEATS] ?? 0} seats${
                      role.grant.capabilities?.length ? ` · ${role.grant.capabilities.join(', ')}` : ''
                    }`}
              </Small>
            }
            trailing={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/operator/roles/${encodeURIComponent(role.name)}`)}>
                Edit
              </Button>
            }
          />
        ))}
      </ScreenBody>
    </Page>
  );
}

/**
 * One role: what it grants, who holds it, and granting it to somebody.
 */
export function OperatorRoleScreen({
  role,
  save,
  holders,
  assign,
  revoke,
}: {
  role: OperatorRole;
  save: ProductMutation<RoleDraft, OperatorRole>;
  holders: ProductQuery<OperatorRoleAssignment[]>;
  assign: ProductMutation<{ accountID: string; expiresAt?: string }, OperatorRoleAssignment>;
  revoke: ProductMutation<string>;
}) {
  const [description, setDescription] = useState(role.description ?? '');
  const [deny, setDeny] = useState(role.deny === true);
  const [seats, setSeats] = useState(String(role.grant.allowances?.[SEATS] ?? 0));
  const [capabilities, setCapabilities] = useState((role.grant.capabilities ?? []).join(', '));
  const [accountID, setAccountID] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const live = (holders.data ?? []).filter(assignment => assignment.revokedAt === undefined && assignment.revokedAt !== null);

  return (
    <Page header={<ScreenHeader title={`Role ${role.name}`} />}>
      <ScreenBody width="band">
        <BackTo to="/operator/roles" label="Roles" />

        <Card variant="filled" className="flex flex-col gap-3">
          <Small>
            Saving changes what this role confers for <strong>every account that holds it</strong>. A
            capability you remove here is gone from them on their next request, with nothing to
            re-assign.
          </Small>
          <TextField
            label="Description"
            hint="shown to a person when this role withholds access"
            value={description}
            onChange={event => setDescription(event.target.value)}
          />
          <CheckboxField
            label="Withhold access"
            checked={deny}
            onChange={setDeny}>
            A withholding role refuses everything the other roles grant, and its description is the
            reason shown.
          </CheckboxField>
          {!deny && <TextField label="Seats" value={seats} onChange={event => setSeats(event.target.value)} />}
          {!deny && (
            <TextField
              label="Capabilities"
              hint="comma separated"
              value={capabilities}
              onChange={event => setCapabilities(event.target.value)}
            />
          )}
          <Button
            isLoading={save.isPending}
            onClick={() => save.mutate(draftFromFields(role.name, description, deny, seats, capabilities))}>
            Save role
          </Button>
          {save.isSuccess && <Small>Saved. Every holder is on the new answer.</Small>}
          {save.error && <ScreenError error={save.error} />}
        </Card>

        <Card variant="filled" className="flex flex-col gap-3">
          <Small>Grant this role to an account</Small>
          <TextField label="Account ID" value={accountID} onChange={event => setAccountID(event.target.value)} />
          <TextField
            label="Expires at"
            hint="optional RFC 3339 timestamp; leave empty for no end"
            value={expiresAt}
            onChange={event => setExpiresAt(event.target.value)}
          />
          <Button
            variant="outline"
            disabled={accountID.trim() === '' || assign.isPending}
            isLoading={assign.isPending}
            onClick={() =>
              assign.mutate(
                expiresAt.trim() === ''
                  ? { accountID: accountID.trim() }
                  : { accountID: accountID.trim(), expiresAt: expiresAt.trim() },
                { onSuccess: () => setAccountID('') },
              )
            }>
            Grant
          </Button>
          {assign.error && <ScreenError error={assign.error} />}
        </Card>

        <Small>Held by</Small>
        {holders.isPending && <ScreenLoading label="Loading holders" />}
        {holders.error && <ScreenError error={holders.error} />}
        {live.length === 0 && !holders.isPending && <Small>Nobody holds this role.</Small>}
        {live.map(assignment => (
          <ListCard
            key={assignment.id}
            title={assignment.accountID}
            meta={
              <Small>
                {assignment.source}
                {assignment.expiresAt ? ` · expires ${new Date(assignment.expiresAt).toLocaleString()}` : ''}
              </Small>
            }
            trailing={
              <Button variant="secondary" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(assignment.accountID)}>
                Revoke
              </Button>
            }
          />
        ))}
        {revoke.error && <ScreenError error={revoke.error} />}
      </ScreenBody>
    </Page>
  );
}


function draftFromFields(name: string, description: string, deny: boolean, seats: string, capabilities: string): RoleDraft {
  const parsed = Number.parseInt(seats.trim(), 10);
  return {
    description: description.trim(),
    deny,
    allowances: Number.isFinite(parsed) && parsed > 0 ? { [SEATS]: parsed } : {},
    capabilities: capabilities
      .split(',')
      .map(value => value.trim())
      .filter(value => value !== ''),
  };
}

/**
 * Re-exported so a caller can render a role's headline without re-deriving it.
 */
export function roleSummary(role: OperatorRole): string {
  if (role.deny) return 'withholds access';
  const seats = role.grant.allowances?.[SEATS] ?? 0;
  const capabilities = role.grant.capabilities ?? [];
  return `${seats} seats${capabilities.length > 0 ? ` · ${capabilities.join(', ')}` : ''}`;
}

/**
 * Kept for callers that want the grant as key/value rows.
 */
export function RoleGrantRows({ role }: { role: OperatorRole }) {
  return (
    <>
      <KeyValue label="Seats" value={String(role.grant.allowances?.[SEATS] ?? 0)} />
      <KeyValue label="Capabilities" value={(role.grant.capabilities ?? []).join(', ') || 'none'} />
      {role.deny && (
        <InlineNotice variant="warning" role="alert">
          This role withholds access.
        </InlineNotice>
      )}
    </>
  );
}
