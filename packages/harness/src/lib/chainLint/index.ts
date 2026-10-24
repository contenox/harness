
import type { ChainDefinition, ChainTask } from '../types';
import { DEFAULT_RULES, type LintRule } from './rules';

export type DiagnosticSeverity = 'warning' | 'info';

export interface Diagnostic {
  ruleId: string;
  severity: DiagnosticSeverity;
  taskId: string;
  message: string;
}

export type { LintRule } from './rules';

export function lintChain(
  chain: ChainDefinition | null | undefined,
  rules: LintRule[] = DEFAULT_RULES,
): Diagnostic[] {
  if (!chain || !chain.tasks) return [];
  const out: Diagnostic[] = [];
  for (const rule of rules) {
    for (const task of chain.tasks) {
      const found = rule.check(task, chain);
      if (found) {
        out.push({
          ruleId: rule.id,
          severity: rule.severity,
          taskId: task.id,
          message: found,
        });
      }
    }
  }
  return out;
}

export function diagnosticsByTask(diagnostics: Diagnostic[]): Map<string, Diagnostic[]> {
  const m = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const list = m.get(d.taskId) ?? [];
    list.push(d);
    m.set(d.taskId, list);
  }
  return m;
}

export function diagnosticCounts(diagnostics: Diagnostic[]): {
  warnings: number;
  infos: number;
} {
  let warnings = 0;
  let infos = 0;
  for (const d of diagnostics) {
    if (d.severity === 'warning') warnings++;
    else infos++;
  }
  return { warnings, infos };
}

export type { ChainTask };
