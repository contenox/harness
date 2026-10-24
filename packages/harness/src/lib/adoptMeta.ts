
export const ADOPT_META_KEY = 'contenox.adopt';

export type AdoptRef = {
  instanceId: string;
  sessionId: string;
};

export function adoptMeta(instanceId: string, sessionId: string): Record<string, unknown> {
  return { [ADOPT_META_KEY]: { instanceId, sessionId } };
}

export type AdoptResult = {
  instanceId: string;
  sessionId: string;
  controller: boolean;
};

export function adoptResultFromMeta(meta: Record<string, unknown> | undefined | null): AdoptResult | null {
  const raw = meta?.[ADOPT_META_KEY];
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Partial<AdoptResult>;
  const instanceId = typeof r.instanceId === 'string' ? r.instanceId.trim() : '';
  const sessionId = typeof r.sessionId === 'string' ? r.sessionId.trim() : '';
  if (instanceId === '' || sessionId === '') return null;
  return { instanceId, sessionId, controller: r.controller === true };
}
