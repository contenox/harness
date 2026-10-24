import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import type { CommandTrigger, SlashCommand } from './types';

const DEFAULT_TRIGGER: CommandTrigger = '/';

function entryTrigger(cmd: SlashCommand): CommandTrigger {
  return cmd.trigger ?? DEFAULT_TRIGGER;
}

function keyFor(trigger: CommandTrigger, name: string): string {
  return `${trigger}${name.toLowerCase()}`;
}

export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommand>();
  private listeners = new Set<() => void>();
  private listSnapshot: SlashCommand[] = [];

  private rebuildListSnapshot() {
    const seen = new Set<SlashCommand>();
    for (const cmd of this.commands.values()) seen.add(cmd);
    this.listSnapshot = Array.from(seen).sort((a, b) => {
      const tA = entryTrigger(a);
      const tB = entryTrigger(b);
      if (tA !== tB) return tA === '/' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  register(cmd: SlashCommand): () => void {
    const trigger = entryTrigger(cmd);
    const keys = [cmd.name, ...(cmd.aliases ?? [])].map((k) => keyFor(trigger, k));
    for (const k of keys) {
      this.commands.set(k, cmd);
    }
    this.rebuildListSnapshot();
    this.emit();
    return () => {
      let dirty = false;
      for (const k of keys) {
        if (this.commands.get(k) === cmd) {
          this.commands.delete(k);
          dirty = true;
        }
      }
      if (dirty) {
        this.rebuildListSnapshot();
        this.emit();
      }
    };
  }

  get(trigger: CommandTrigger, name: string): SlashCommand | undefined {
    return this.commands.get(keyFor(trigger, name));
  }

  list(): SlashCommand[] {
    return this.listSnapshot;
  }

  namesStartingWith(trigger: CommandTrigger, prefix: string): string[] {
    const p = prefix.toLowerCase();
    const names = new Set<string>();
    for (const cmd of this.list()) {
      if (entryTrigger(cmd) !== trigger) continue;
      if (cmd.name.startsWith(p)) names.add(cmd.name);
    }
    return Array.from(names).sort();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }
}

const SlashCommandRegistryContext = createContext<SlashCommandRegistry | null>(null);

export function SlashCommandRegistryProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => new SlashCommandRegistry(), []);
  return createElement(SlashCommandRegistryContext.Provider, { value: registry }, children);
}

export function useSlashCommandRegistry(): SlashCommandRegistry {
  const reg = useContext(SlashCommandRegistryContext);
  if (!reg) {
    throw new Error('useSlashCommandRegistry must be used inside SlashCommandRegistryProvider');
  }
  return reg;
}

export function useSlashCommand(command: SlashCommand | null) {
  const registry = useSlashCommandRegistry();
  useEffect(() => {
    if (!command) return undefined;
    return registry.register(command);
  }, [registry, command]);
}

export function useSlashCommands(): SlashCommand[] {
  const registry = useSlashCommandRegistry();
  return useSyncExternalStore(
    (cb) => registry.subscribe(cb),
    () => registry.list(),
    () => [],
  );
}

export function parseSlashInvocation(text: string): {
  trigger: CommandTrigger;
  name: string;
  rawArgs: string;
  body: string;
} | null {
  const first = text[0];
  if (first !== '/' && first !== '@') return null;
  const trigger: CommandTrigger = first;
  const newlineIdx = text.indexOf('\n');
  const firstLine = newlineIdx >= 0 ? text.slice(0, newlineIdx) : text;
  const body = newlineIdx >= 0 ? text.slice(newlineIdx + 1) : '';
  const re = trigger === '/' ? /^\/([a-zA-Z][a-zA-Z0-9_-]*)\s*(.*)$/ : /^@([a-zA-Z][a-zA-Z0-9_-]*)\s*(.*)$/;
  const match = firstLine.match(re);
  if (!match) return null;
  return {
    trigger,
    name: match[1]!.toLowerCase(),
    rawArgs: (match[2] ?? '').trim(),
    body: body.replace(/^\n+/, ''),
  };
}
