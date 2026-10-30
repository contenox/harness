import { Button, FormField, Input } from '@contenox/ui';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { usePatchConnection } from '../../hooks/useConnections';
import { getCloudProviderSetup, isCloudProviderType } from '../../lib/providerCatalog';
import { mapSetupError } from '../../lib/providerSetupValues';
import type { Connection } from '../../lib/types';

type Props = {
  connection: Connection;
  onDone: () => void;
};

/** Inline rename. A taken or invalid name is reported on the field. */
export function ConnectionRename({ connection, onDone }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(connection.name);
  const patch = usePatchConnection();

  const setup = getCloudProviderSetup(
    isCloudProviderType(connection.providerType) ? connection.providerType : 'openai',
  );
  const mapped = patch.error ? mapSetupError(patch.error, setup) : undefined;
  const errorKey = mapped?.fieldErrors.name;
  const error = errorKey ? t(errorKey) : mapped?.message;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = name.trim();
    if (!next || next === connection.name) return onDone();
    patch.mutate({ id: connection.id, name: next }, { onSuccess: onDone });
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={submit}>
      <FormField label={t('connections.rename_label')} error={error}>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          error={!!error}
          autoFocus
          spellCheck={false}
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {t('connections.cancel')}
        </Button>
        <Button type="submit" size="sm" isLoading={patch.isPending}>
          {t('connections.rename_save')}
        </Button>
      </div>
    </form>
  );
}
