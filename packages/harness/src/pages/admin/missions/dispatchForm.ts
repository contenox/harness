import type { TranslationKey } from '../../../i18n';

export type DispatchFormValues = {
  agentName: string;
  intent: string;
  hitlPolicyName: string;
  cwd: string;
};

export type DispatchFormErrors = Partial<
  Record<keyof Omit<DispatchFormValues, 'cwd'>, TranslationKey>
>;

export function validateDispatchForm(values: DispatchFormValues): DispatchFormErrors {
  const errors: DispatchFormErrors = {};
  if (!values.agentName.trim()) {
    errors.agentName = 'missions.form_error_agent';
  }
  if (!values.intent.trim()) {
    errors.intent = 'missions.form_error_intent_required';
  } else if (/[\r\n]/.test(values.intent)) {
    errors.intent = 'missions.form_error_intent_single_line';
  }
  if (!values.hitlPolicyName.trim()) {
    errors.hitlPolicyName = 'missions.form_error_envelope';
  }
  return errors;
}

export function canSubmitDispatchForm(values: DispatchFormValues): boolean {
  return Object.keys(validateDispatchForm(values)).length === 0;
}
