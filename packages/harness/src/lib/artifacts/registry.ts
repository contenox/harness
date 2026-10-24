import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode, createElement } from 'react';

import type { ChatContextArtifact } from '../types';

export interface ArtifactSource {
  readonly id: string;
  readonly label: string;
  collect(): ChatContextArtifact | null | undefined;
}

export class ArtifactRegistry {
  private sources = new Map<string, ArtifactSource>();
  private listeners = new Set<() => void>();
  private listSnapshot: ArtifactSource[] = [];

  private rebuildListSnapshot() {
    this.listSnapshot = Array.from(this.sources.values());
  }

  register(source: ArtifactSource): () => void {
    this.sources.set(source.id, source);
    this.rebuildListSnapshot();
    this.emit();
    return () => {
      if (this.sources.get(source.id) === source) {
        this.sources.delete(source.id);
        this.rebuildListSnapshot();
        this.emit();
      }
    };
  }

  list(): ArtifactSource[] {
    return this.listSnapshot;
  }

  collect(): ChatContextArtifact[] {
    return this.collectWithSources().map((p) => p.artifact);
  }

  collectWithSources(): Array<{ source: ArtifactSource; artifact: ChatContextArtifact }> {
    const out: Array<{ source: ArtifactSource; artifact: ChatContextArtifact }> = [];
    for (const source of this.sources.values()) {
      const artifact = source.collect();
      if (artifact) out.push({ source, artifact });
    }
    return out;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

const ArtifactRegistryContext = createContext<ArtifactRegistry | null>(null);

export function ArtifactRegistryProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => new ArtifactRegistry(), []);
  return createElement(ArtifactRegistryContext.Provider, { value: registry }, children);
}

export function useArtifactRegistry(): ArtifactRegistry {
  const reg = useContext(ArtifactRegistryContext);
  if (!reg) {
    throw new Error('useArtifactRegistry must be used inside an ArtifactRegistryProvider');
  }
  return reg;
}

export function useArtifactSource(source: ArtifactSource | null) {
  const registry = useArtifactRegistry();
  useEffect(() => {
    if (!source) return undefined;
    return registry.register(source);
  }, [registry, source]);
}

export function useArtifactSources(): ArtifactSource[] {
  const registry = useArtifactRegistry();
  return useSyncExternalStore(
    (cb) => registry.subscribe(cb),
    () => registry.list(),
    () => [],
  );
}
