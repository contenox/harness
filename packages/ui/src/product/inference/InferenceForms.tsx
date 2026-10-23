import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { Form } from '../../components/Form';
import { FormField } from '../../components/FormField';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { InlineNotice } from '../../components/InlineNotice';
import type { InferenceBackend, InferencePool, ProviderStatus } from './types';

export function BackendForm({
  value,
  kinds,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  value?: InferenceBackend;
  kinds: Array<{ value: string; label: string }>;
  pending?: boolean;
  error?: string;
  onCancel?: () => void;
  onSubmit: (value: { name: string; endpoint: string; kind: string }) => void;
}) {
  const [name, setName] = useState(value?.name ?? '');
  const [endpoint, setEndpoint] = useState(value?.endpoint ?? '');
  const [kind, setKind] = useState(value?.kind ?? kinds[0]?.value ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ name: name.trim(), endpoint: endpoint.trim(), kind });
  };
  return (
    <Form
      title={value ? 'Edit backend' : 'Add backend'}
      onSubmit={submit}
      error={error}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            disabled={pending || !name.trim() || !endpoint.trim() || !kind}>
            {pending ? 'Saving…' : 'Save backend'}
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
      <FormField label="Endpoint" required>
        <Input
          type="url"
          value={endpoint}
          onChange={event => setEndpoint(event.target.value)}
          placeholder="http://worker:8000"
        />
      </FormField>
      <FormField label="Backend type" required>
        <Select value={kind} onChange={event => setKind(event.target.value)} options={kinds} />
      </FormField>
    </Form>
  );
}

export function PoolForm({
  value,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  value?: InferencePool;
  pending?: boolean;
  error?: string;
  onCancel?: () => void;
  onSubmit: (value: { name: string; purpose: string }) => void;
}) {
  const [name, setName] = useState(value?.name ?? '');
  const [purpose, setPurpose] = useState(value?.purpose ?? '');
  return (
    <Form
      title={value ? 'Edit pool' : 'Create pool'}
      error={error}
      onSubmit={event => {
        event.preventDefault();
        onSubmit({ name: name.trim(), purpose: purpose.trim() });
      }}
      actions={
        <>
          <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
            {pending ? 'Saving…' : 'Save pool'}
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
      <FormField label="Purpose">
        <Input
          value={purpose}
          onChange={event => setPurpose(event.target.value)}
          placeholder="Production chat"
        />
      </FormField>
    </Form>
  );
}

export function ModelDeclarationForm({
  pending,
  error,
  onSubmit,
}: {
  pending?: boolean;
  error?: string;
  onSubmit: (model: string) => void;
}) {
  const [model, setModel] = useState('');
  return (
    <Form
      title="Declare model"
      error={error}
      onSubmit={event => {
        event.preventDefault();
        const next = model.trim();
        if (next) onSubmit(next);
      }}
      actions={
        <Button type="submit" variant="primary" disabled={pending || !model.trim()}>
          {pending ? 'Declaring…' : 'Declare model'}
        </Button>
      }>
      <FormField label="Model" required>
        <Input
          value={model}
          onChange={event => setModel(event.target.value)}
          placeholder="organization/model"
        />
      </FormField>
    </Form>
  );
}

export function ProviderCredentialForm({
  provider,
  status,
  pending,
  error,
  onSubmit,
}: {
  provider: string;
  status?: ProviderStatus;
  pending?: boolean;
  error?: string;
  onSubmit: (value: { apiKey: string; model?: string }) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  return (
    <Form
      title={`Configure ${provider}`}
      error={error}
      onSubmit={event => {
        event.preventDefault();
        onSubmit({ apiKey, model: model.trim() || undefined });
      }}
      actions={
        <Button type="submit" variant="primary" disabled={pending || !apiKey}>
          {pending ? 'Configuring…' : 'Configure'}
        </Button>
      }>
      {status && (
        <InlineNotice variant="info">
          {status.configured
            ? `Configured${status.updatedAt ? ` · ${new Date(status.updatedAt).toLocaleString()}` : ''}`
            : 'Not configured'}
        </InlineNotice>
      )}
      <FormField label="API key" required>
        <Input
          type="password"
          value={apiKey}
          onChange={event => setApiKey(event.target.value)}
          autoComplete="off"
        />
      </FormField>
      <FormField label="Default model">
        <Input value={model} onChange={event => setModel(event.target.value)} />
      </FormField>
    </Form>
  );
}
