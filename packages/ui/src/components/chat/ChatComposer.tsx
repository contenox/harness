import React, { type FormEvent, useRef, useState } from "react";
import { cn } from "../../utils";
import { Badge } from "../Badge";
import { Textarea } from "../TextArea";
import { H2 } from "../Typography";
import { Tooltip } from "../Tooltip";
import { IconButton } from "../IconButton";
import { ArrowUp } from "lucide-react";
import {
  DEFAULT_COMPOSER_SOFT_MAX,
  isComposerCharCountWarning,
  isOverComposerSoftMax,
} from "./composerSoftLimit";

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  placeholder?: string;
  isPending?: boolean;
  disabled?: boolean;
  /** Used as the send button's accessible label / tooltip (string). */
  submitLabel?: React.ReactNode;
  pendingLabel?: React.ReactNode;
  /** Icon inside the send button. Defaults to an up arrow. */
  submitIcon?: React.ReactNode;
  title?: string;
  className?: string;
  variant?: "default" | "compact" | "workbench";

  shell?: "panel" | "plain";

  softMax?: number;

  maxLength?: number;
  showCharCount?: boolean;
  charCountFormatter?: (length: number, softMax: number) => string;

  canSubmit?: boolean;

  allowEmptyMessage?: boolean;
  footerStart?: React.ReactNode;

  footerEnd?: React.ReactNode;

  attachments?: React.ReactNode;

  charCountTooltip?: string;

  softLimitExceededNote?: string;
  textareaProps?: Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange"
  >;
};

const baseTextarea =
  "w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-text " +
  "placeholder:text-text-subtle focus-visible:border-0 focus-visible:outline-none";

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder = "",
  isPending = false,
  disabled = false,
  submitLabel = "Send",
  pendingLabel = "Sending…",
  submitIcon,
  title,
  className,
  variant = "default",
  shell,
  softMax: softMaxProp,
  maxLength: maxLengthLegacy,
  showCharCount = true,
  charCountFormatter,
  canSubmit = true,
  allowEmptyMessage = false,
  footerStart,
  footerEnd,
  attachments,
  charCountTooltip,
  softLimitExceededNote,
  textareaProps,
}: ChatComposerProps) {
  const softMax = softMaxProp ?? maxLengthLegacy ?? DEFAULT_COMPOSER_SOFT_MAX;
  const formRef = useRef<HTMLFormElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const {
    onKeyDown: onKeyDownProp,
    className: textareaClassName,
    ...restTextareaProps
  } = textareaProps ?? {};

  const submitDisabled =
    disabled ||
    isPending ||
    (!allowEmptyMessage && !value.trim()) ||
    !canSubmit;

  const effectiveShell: "panel" | "plain" =
    shell ?? (variant === "workbench" ? "plain" : "panel");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDownProp?.(e);
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!submitDisabled) {
        formRef.current?.requestSubmit();
      }
    }
  };

  const countWarning = isComposerCharCountWarning(value.length, softMax);
  const overSoftMax = isOverComposerSoftMax(value.length, softMax);




  const countStr = charCountFormatter
    ? charCountFormatter(value.length, softMax)
    : countWarning
      ? `${value.length}/${softMax}`
      : `${value.length}`;

  const showCount = showCharCount && value.length > 0;

  const textareaBlock = (
    <div className="relative flex-1">
      <Textarea
        {...restTextareaProps}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={!allowEmptyMessage}
        disabled={disabled}
        className={cn(
          baseTextarea,
          variant === "compact"
            ? "min-h-[40px] max-h-48"
            : variant === "workbench"
              ? "min-h-[140px] max-h-[50vh] resize-y sm:min-h-[180px]"
              : "min-h-[52px] max-h-64",
          textareaClassName,
        )}
        onKeyDown={handleKeyDown}
      />
      {showCount && (
        <div className="absolute right-2 bottom-2 flex items-center gap-2">
          {charCountTooltip != null ? (
            <Tooltip content={charCountTooltip}>
              <Badge variant={countWarning ? "warning" : "outline"} size="sm">
                {countStr}
              </Badge>
            </Tooltip>
          ) : (
            <Badge variant={countWarning ? "warning" : "outline"} size="sm">
              {countStr}
            </Badge>
          )}
        </div>
      )}
    </div>
  );

  const softNoteBlock =
    overSoftMax && softLimitExceededNote ? (
      <p className="text-text-muted px-2 text-xs">
        {softLimitExceededNote}
      </p>
    ) : null;

  const submitButton = () => (
    <IconButton
      type="submit"
      variant="primary"
      size="md"
      label={
        typeof (isPending ? pendingLabel : submitLabel) === "string"
          ? ((isPending ? pendingLabel : submitLabel) as string)
          : "Send"
      }
      disabled={submitDisabled}
      isLoading={isPending}
      className="rounded-full"
    >
      {submitIcon ?? <ArrowUp className="size-4" />}
    </IconButton>
  );

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  if (variant === "compact") {
    return (
      <div className={className}>
        {attachments}
        <form
          ref={formRef}
          onSubmit={handleFormSubmit}
          className="flex items-end gap-2 rounded-xl border border-line bg-raised p-2 focus-within:border-line-strong"
        >
          {textareaBlock}
          {submitButton()}
        </form>
      </div>
    );
  }

  const formInner = (
    <form ref={formRef} onSubmit={handleFormSubmit} className="flex flex-col gap-2">
      {title != null && title !== "" && variant !== "workbench" && (
        <H2 className="px-2 pt-1 text-base font-semibold">{title}</H2>
      )}
      {attachments}
      {textareaBlock}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1">
          {footerStart}
          {footerEnd}
        </div>
        <div className="shrink-0">{submitButton()}</div>
      </div>
      {softNoteBlock}
    </form>
  );

  if (variant === "workbench" && effectiveShell === "plain") {
    return (
      <div
        className={cn(
          "border-t border-line bg-app px-3 py-3 sm:px-4",
          isFocused && "border-line-strong",
          className,
        )}
      >
        {formInner}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-raised p-2 transition-colors",
        isFocused ? "border-line-strong" : "border-line",
        className,
      )}
    >
      {formInner}
    </div>
  );
}
