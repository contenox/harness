import { Checkbox } from '../Checkbox';
import { FormField } from '../FormField';
import { Input, PasswordInput } from '../Input';
import { Select } from '../Select';
import { Textarea } from '../TextArea';
import type { ComponentProps, ReactNode } from 'react';


type FieldProps = Omit<ComponentProps<typeof Input>, 'error'> & {
  label: string;
  error?: string;

  hint?: string;
};

export function TextField({ label, error, hint, required, ...props }: FieldProps) {
  return (
    <FormField label={label} required={required} error={error} description={hint}>
      <Input error={error !== undefined} required={required} {...props} />
    </FormField>
  );
}

export function EmailField(props: FieldProps) {
  return (
    <TextField
      type="email"
      autoComplete="email"
      autoCapitalize="none"
      autoCorrect="off"
      inputMode="email"
      {...props}
    />
  );
}

export function PasswordField({ label, error, hint, required, ...props }: FieldProps) {
  return (
    <FormField label={label} required={required} error={error} description={hint}>
      <PasswordInput error={error !== undefined} required={required} {...props} />
    </FormField>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<typeof Textarea>, 'error'> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextAreaField({ label, error, hint, required, ...props }: TextAreaFieldProps) {
  return (
    <FormField label={label} required={required} error={error} description={hint}>
      <Textarea error={error !== undefined} required={required} {...props} />
    </FormField>
  );
}

type SelectFieldProps = Omit<ComponentProps<typeof Select>, 'error'> & {
  label: string;
  error?: string;
  hint?: string;
};

export function SelectField({ label, error, hint, required, ...props }: SelectFieldProps) {
  return (
    <FormField label={label} required={required} error={error} description={hint}>
      <Select className="w-full" required={required} {...props} />
    </FormField>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
  error,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;

  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-11 flex-col justify-center gap-1 py-1">
      <Checkbox
        label={label}
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      {children && (
        <div className="text-text-muted dark:text-dark-text-muted text-xs">{children}</div>
      )}
      {error !== undefined && (
        <p className="text-error dark:text-dark-error text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
