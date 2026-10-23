import { useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Form } from '../../components/Form';
import { FormField } from '../../components/FormField';
import { Input } from '../../components/Input';
import { ListCard } from '../../components/ListCard';
import { Select } from '../../components/Select';
import { Small } from '../../components/Typography';
import type { AccessGrant, ManagedUser } from './types';

export function UserList({
  users,
  busyID,
  onEdit,
  onDelete,
  onManageAccess,
}: {
  users: ManagedUser[];
  busyID?: string;
  onEdit?: (user: ManagedUser) => void;
  onDelete?: (user: ManagedUser) => void;
  onManageAccess?: (user: ManagedUser) => void;
}) {
  if (users.length === 0)
    return <EmptyState title="No users" description="Create a user to grant access." />;
  return (
    <div className="space-y-3">
      {users.map(user => (
        <ListCard
          key={user.id}
          title={user.name || user.email}
          meta={
            <>
              <Small>{user.email}</Small>
              <Small className="block font-mono">{user.subject}</Small>
            </>
          }
          trailing={
            <div className="flex flex-wrap gap-2">
              {onManageAccess && (
                <Button size="sm" variant="outline" onClick={() => onManageAccess(user)}>
                  Access
                </Button>
              )}
              {onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busyID === user.id}
                  onClick={() => onDelete(user)}>
                  {busyID === user.id ? 'Deleting…' : 'Delete'}
                </Button>
              )}
            </div>
          }
        />
      ))}
    </div>
  );
}

export function UserForm({
  value,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  value?: ManagedUser;
  pending?: boolean;
  error?: string;
  onCancel?: () => void;
  onSubmit: (value: { name: string; email: string; subject: string; password?: string }) => void;
}) {
  const [name, setName] = useState(value?.name ?? '');
  const [email, setEmail] = useState(value?.email ?? '');
  const [subject, setSubject] = useState(value?.subject ?? '');
  const [password, setPassword] = useState('');
  return (
    <Form
      title={value ? 'Edit user' : 'Create user'}
      error={error}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          password: value ? undefined : password,
        });
      }}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            disabled={
              pending || !name.trim() || !email.trim() || !subject.trim() || (!value && !password)
            }>
            {pending ? 'Saving…' : 'Save user'}
          </Button>
          {value && onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </>
      }>
      <FormField label="Name" required>
        <Input value={name} onChange={event => setName(event.target.value)} />
      </FormField>
      <FormField label="Email" required>
        <Input type="email" value={email} onChange={event => setEmail(event.target.value)} />
      </FormField>
      <FormField label="Subject" required>
        <Input value={subject} onChange={event => setSubject(event.target.value)} />
      </FormField>
      {!value && (
        <FormField label="Password" required>
          <Input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </FormField>
      )}
    </Form>
  );
}

export function AccessGrantList({
  grants,
  identity,
  busyID,
  onClearIdentity,
  onEdit,
  onDelete,
}: {
  grants: AccessGrant[];
  identity?: string;
  busyID?: string;
  onClearIdentity?: () => void;
  onEdit?: (grant: AccessGrant) => void;
  onDelete?: (grant: AccessGrant) => void;
}) {
  return (
    <div className="space-y-3">
      {identity && (
        <div className="flex items-center justify-between gap-3">
          <Small>Filtered by {identity}</Small>
          {onClearIdentity && (
            <Button size="sm" variant="ghost" onClick={onClearIdentity}>
              Clear filter
            </Button>
          )}
        </div>
      )}
      {grants.length === 0 ? (
        <EmptyState title="No access grants" description="Grant a user access to a resource." />
      ) : (
        grants.map(grant => (
          <ListCard
            key={grant.id}
            title={grant.identityName || grant.identity}
            meta={
              <div className="flex flex-wrap gap-2">
                <Small>{grant.identityEmail}</Small>
                <Badge variant="primary">{grant.permission}</Badge>
                <Badge variant="outline">{grant.resourceType}</Badge>
                <Small>{grant.resourceLabel || grant.resource}</Small>
              </div>
            }
            trailing={
              <div className="flex flex-wrap gap-2">
                {onEdit && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(grant)}>
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyID === grant.id}
                    onClick={() => onDelete(grant)}>
                    {busyID === grant.id ? 'Deleting…' : 'Delete'}
                  </Button>
                )}
              </div>
            }
          />
        ))
      )}
    </div>
  );
}

export function AccessGrantForm({
  value,
  identities,
  permissions,
  resources,
  resourceTypes,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  value?: AccessGrant;
  identities: Array<{ value: string; label: string }>;
  permissions: string[];
  resources: Array<{ value: string; label: string }>;
  resourceTypes: string[];
  pending?: boolean;
  error?: string;
  onCancel?: () => void;
  onSubmit: (
    value: Omit<AccessGrant, 'id' | 'identityName' | 'identityEmail' | 'resourceLabel'>,
  ) => void;
}) {
  const [identity, setIdentity] = useState(value?.identity ?? '');
  const [permission, setPermission] = useState(value?.permission ?? '');
  const [resource, setResource] = useState(value?.resource ?? '');
  const [resourceType, setResourceType] = useState(value?.resourceType ?? '');
  return (
    <Form
      title={value ? 'Edit access grant' : 'Create access grant'}
      error={error}
      onSubmit={event => {
        event.preventDefault();
        onSubmit({ identity, permission, resource, resourceType });
      }}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            disabled={pending || !identity || !permission || !resource || !resourceType}>
            {pending ? 'Saving…' : 'Save grant'}
          </Button>
          {value && onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </>
      }>
      <FormField label="Identity" required>
        <Select
          value={identity}
          onChange={event => setIdentity(event.target.value)}
          placeholder="Select identity"
          options={identities}
        />
      </FormField>
      <FormField label="Permission" required>
        <Select
          value={permission}
          onChange={event => setPermission(event.target.value)}
          placeholder="Select permission"
          options={permissions.map(item => ({ value: item, label: item }))}
        />
      </FormField>
      <FormField label="Resource" required>
        <Select
          value={resource}
          onChange={event => setResource(event.target.value)}
          placeholder="Select resource"
          options={resources}
        />
      </FormField>
      <FormField label="Resource type" required>
        <Select
          value={resourceType}
          onChange={event => setResourceType(event.target.value)}
          placeholder="Select resource type"
          options={resourceTypes.map(item => ({ value: item, label: item }))}
        />
      </FormField>
    </Form>
  );
}
