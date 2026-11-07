import type { TFunction } from 'i18next';

const ROUTED_TO = /^Routed to (.+)$/;
const BEDROCK_NOT_ENABLED = /Bedrock model (\S+) is not enabled for this AWS account\b/;
const VERTEX_CREDENTIALS = /Vertex AI needs Google credentials\b/;
const EXECUTION_FAILED = /^Execution failed$/;
const APPROVAL_NOTES = {
  'Approved by Oracle: part of your request': 'runtime_texts.approved_by_oracle',
  'Denied by Oracle: not part of your request': 'runtime_texts.denied_by_oracle',
  'Approved from the Inbox': 'runtime_texts.approved_from_inbox',
  'Denied from the Inbox': 'runtime_texts.denied_from_inbox',
  'No answer before the deadline': 'runtime_texts.ask_expired',
} as const;

export function translateRoutingLabel(title: string, t: TFunction): string {
  const match = ROUTED_TO.exec(title.trim());
  if (!match) return title;
  const name = match[1].trim();
  const target =
    name === 'coding'
      ? t('acp_chat.route_target_coding')
      : name === 'general'
        ? t('acp_chat.route_target_general')
        : name;
  return t('acp_chat.routed_to', { target });
}

export function translateRuntimeText(text: string, t: TFunction): string {
  const trimmed = text.trim();
  const bedrock = BEDROCK_NOT_ENABLED.exec(trimmed);
  if (bedrock) return t('runtime_texts.bedrock_model_not_enabled', { model: bedrock[1] });
  if (VERTEX_CREDENTIALS.test(trimmed)) return t('runtime_texts.vertex_credentials');
  if (EXECUTION_FAILED.test(trimmed)) return t('acp_chat.error_banner_headline');
  const approval = APPROVAL_NOTES[trimmed as keyof typeof APPROVAL_NOTES];
  if (approval) return t(approval);
  return text;
}
