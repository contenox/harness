import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import type { Agent, FleetEntry, HITLApproval, Mission, WorkspaceRoot } from '../types';
import type { SessionInfo } from '../acp';

export type PaletteItemType =
  | 'action'
  | 'mission'
  | 'agent'
  | 'session'
  | 'fleet'
  | 'workspace'
  | 'inbox';

export interface PaletteItem {
  id: string;
  type: PaletteItemType;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  keywords?: string[];
  action: () => void;
}

export interface PaletteProviderContext {
  t: TFunction;
  navigate: (to: string) => void;
  startAdopt: (ref: { instanceId: string; sessionId: string }) => void;

  missions: Mission[];
  fleet: FleetEntry[];
  agents: Agent[];
  approvals: HITLApproval[];
  sessions: SessionInfo[];
  workspaceRoots: WorkspaceRoot[];
}

export type PaletteProvider = (ctx: PaletteProviderContext) => PaletteItem[];
