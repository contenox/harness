
import { AcpClient, type AcpClientOptions } from './client';
import type { Transport } from './transport';
import type { ClientCapabilities } from './types';

export interface AcpCapabilityProvider {
  capabilities(): Partial<ClientCapabilities>;
  handleRequest(method: string, params: unknown): Promise<unknown>;
  dispose?(): void;
}

export function createAcpClient(
  transport: Transport,
  opts: { capabilities?: AcpCapabilityProvider } = {},
): AcpClient {
  const clientOpts: AcpClientOptions = { capabilities: opts.capabilities };
  return new AcpClient(transport, clientOpts);
}
