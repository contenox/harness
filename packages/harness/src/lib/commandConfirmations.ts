import type { TFunction } from 'i18next';

const THINK_SET = /^Think set to (\S+) for this session\.$/;
const THINK_CURRENT = /^Think: (\S+)$/;

export function translateCommandConfirmation(text: string, t: TFunction): string {
  const trimmed = text.trim();
  const set = THINK_SET.exec(trimmed);
  if (set) return t('acp_chat.command_think_set', { level: set[1] });
  const current = THINK_CURRENT.exec(trimmed);
  if (current) return t('acp_chat.command_think_current', { level: current[1] });
  return text;
}
