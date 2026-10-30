import type { Connection } from './types';

export type SignInVerifyDeps = {
  list: () => Promise<Connection[]>;
  check: (id: string) => Promise<Connection>;
};

/** The connection a per-type sign-in acted on: the one named after the type, else the first of the type. */
export function connectionForSignIn(
  connections: Connection[],
  providerType: string,
): Connection | undefined {
  const ofType = connections.filter(c => c.providerType === providerType);
  return ofType.find(c => c.name === providerType) ?? ofType[0];
}

/**
 * After a device-code sign-in, run the runtime's discovery check for the connection so the
 * model list is fresh before the default model is chosen. Best effort: a failed lookup or
 * check resolves with whatever is known, because the caller can still wait on the setup status.
 */
export async function verifyProviderSignIn(
  deps: SignInVerifyDeps,
  providerType: string,
): Promise<Connection | undefined> {
  let connection: Connection | undefined;
  try {
    connection = connectionForSignIn(await deps.list(), providerType);
    if (!connection) return undefined;
    return await deps.check(connection.id);
  } catch {
    return connection;
  }
}
