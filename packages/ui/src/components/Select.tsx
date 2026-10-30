import { forwardRef } from "react";
import { cn } from "../utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-8 appearance-none rounded-lg border border-line-strong bg-raised py-0 pr-8 pl-3 text-[13px] text-text",
        "transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50",
        "bg-[url('data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2724%27%20height=%2724%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23888%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3e%3cpath%20d=%27m6%209%206%206%206-6%27/%3e%3c/svg%3e')]",
        "bg-[length:14px_14px] bg-[position:right_10px_center] bg-no-repeat",
        className,
      )}
      {...props}
    >
      {placeholder && (
        <SelectOption value="" disabled hidden>
          {placeholder}
        </SelectOption>
      )}
      {options.map((option) => (
        <SelectOption
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </SelectOption>
      ))}
    </select>
  ),
);
Select.displayName = "Select";

type SelectOptionProps = React.OptionHTMLAttributes<HTMLOptionElement>;

export const SelectOption = forwardRef<HTMLOptionElement, SelectOptionProps>(
  ({ className, ...props }, ref) => (
    <option
      ref={ref}
      className={cn(
        "bg-raised text-text",
        className,
      )}
      {...props}
    />
  ),
);
SelectOption.displayName = "SelectOption";
