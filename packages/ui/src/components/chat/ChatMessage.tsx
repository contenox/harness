import { Check } from "lucide-react";
import { useState } from "react";
import { cn } from "../../utils";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Card } from "../Card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../Collapsible";
import { Panel } from "../Panel";
import { Span } from "../Typography";
import { Tooltip } from "../Tooltip";
import { copyTextToClipboard } from "./clipboard";
import type { ChatMessageBaseProps } from "./types";

function defaultAvatarLetter(role: ChatMessageBaseProps["role"]): string {
  switch (role) {
    case "user":
      return "U";
    case "system":
      return "S";
    case "tool":
      return "T";
    default:
      return "A";
  }
}

function avatarRingClass(role: ChatMessageBaseProps["role"]): string {


  switch (role) {
    case "user":
      return "bg-solid text-on-solid";
    case "system":
      return "bg-selected text-text-muted";
    case "tool":
      return "bg-selected text-text-muted";
    default:
      return "bg-selected text-text-muted";
  }
}

function roleBadgeVariant(
  role: ChatMessageBaseProps["role"],
): "primary" | "accent" | "secondary" {
  if (role === "user") return "primary";
  if (role === "system") return "accent";
  return "secondary";
}

function bubbleBgClass(role: ChatMessageBaseProps["role"]): string {
  const isUser = role === "user";
  if (isUser) {
    return "bg-selected text-text";
  }
  return "bg-raised text-text";
}

function transcriptBlockClass(role: ChatMessageBaseProps["role"]): string {
  switch (role) {
    case "user":
      return "border-l-solid bg-transparent text-text";
    case "system":
      return "border-l-line-strong bg-transparent text-text";
    case "tool":
      return "border-l-line-strong bg-transparent text-text";
    default:
      return "border-l-line-strong bg-transparent text-text";
  }
}

export function ChatMessage({
  role,
  roleLabel,
  children,
  avatar,
  timestamp,
  timestampTooltip,
  isLatest = false,
  latestLabel,
  highlightLatest = true,
  defaultOpen = true,
  onOpenChange,
  collapsible = true,
  error,
  onRetry,
  retryLabel,
  collapseToggleLabel,
  secondaryActions,
  copyText,
  copyLabel,
  copiedLabel,
  className,
  "aria-label": ariaLabel,
  appearance = "bubble",
  showRoleLabel = false,
}: ChatMessageBaseProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";



  const effectiveOpen = collapsible ? open : true;

  const bubbleRing =
    isLatest && highlightLatest
      ? "ring-1 ring-line-strong"
      : "";

  const transcriptRing =
    isLatest && highlightLatest
      ? "ring-1 ring-line-strong"
      : "";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const handleCopy = async (button?: HTMLButtonElement | null) => {
    if (!copyText) return;
    const ok = await copyTextToClipboard(copyText);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);





      button?.blur();
    }
  };

  const collapseLabels = collapseToggleLabel ?? {
    open: "Hide",
    closed: "Show",
  };

  const ts = timestampTooltip ? (
    <Tooltip content={timestampTooltip}>
      <Span
        variant="muted"
        className="text-text-subtle text-xs"
      >
        {timestamp}
      </Span>
    </Tooltip>
  ) : (
    <Span
      variant="muted"
      className="text-text-subtle text-xs"
    >
      {timestamp}
    </Span>
  );

  const articleLabel =
    ariaLabel ?? (typeof roleLabel === "string" ? roleLabel : "message");

  if (appearance === "plain") {
    const copyButton = copyText != null && (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs"
        onClick={e => void handleCopy(e.currentTarget)}
        aria-live="polite"
        type="button"
        aria-label={
          copied
            ? copiedLabel != null
              ? String(copiedLabel)
              : "Copied"
            : copyLabel != null
              ? String(copyLabel)
              : "Copy"
        }
      >
        {copied ? (
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5" aria-hidden />
            {copiedLabel ?? "Copied!"}
          </span>
        ) : (
          (copyLabel ?? "Copy")
        )}
      </Button>
    );
    return (
      <article
        aria-label={articleLabel}
        className={cn("group flex flex-col gap-1", isUser && "items-end", className)}
      >
        {!isUser && showRoleLabel && (
          <Span variant="muted" className="text-xs">
            {roleLabel}
          </Span>
        )}
        <div
          className={cn(
            "min-w-0",
            isUser ? "max-w-[85%] rounded-2xl bg-selected px-4 py-2.5 text-text" : "w-full text-text",
          )}
        >
          <div className="prose prose-compact dark:prose-invert max-w-none min-w-0">
            {children}
          </div>
          {error != null && (
            <Panel className="mt-2 rounded-lg bg-error/10 p-3 text-text">
              <div className="flex items-center justify-between gap-2">
                <Span className="text-sm">{error}</Span>
                {onRetry != null && (
                  <Button variant="ghost" size="sm" onClick={onRetry}>
                    {retryLabel ?? "Retry"}
                  </Button>
                )}
              </div>
            </Panel>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-2 p-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
            isUser && "flex-row-reverse",
          )}
        >
          {copyButton}
          {secondaryActions}
        </div>
      </article>
    );
  }

  if (appearance === "transcript") {
    return (
      <article aria-label={articleLabel} className={cn("group", className)}>
        <Collapsible
          open={effectiveOpen}
          onOpenChange={handleOpenChange}
          className="flex flex-col gap-1.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={roleBadgeVariant(role)} size="sm">
              {roleLabel}
            </Badge>
            {timestamp != null && ts}
            {isLatest && latestLabel != null && (
              <Badge variant="success" size="sm">
                {latestLabel}
              </Badge>
            )}
            {collapsible && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-6 px-2 text-xs"
                  type="button"
                >
                  {open ? collapseLabels.open : collapseLabels.closed}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          <CollapsibleContent>
            <div
              className={cn(
                "rounded-r-lg border border-l-2 border-line py-3 pr-3 pl-4",
                transcriptBlockClass(role),
                transcriptRing,
              )}
            >
              <div className="prose prose-compact dark:prose-invert max-w-none min-w-0">
                {children}
              </div>

              {error != null && (
                <Panel className="mt-2 rounded-lg bg-error/10 p-3 text-text">
                  <div className="flex items-center justify-between gap-2">
                    <Span className="text-sm">{error}</Span>
                    {onRetry != null && (
                      <Button variant="ghost" size="sm" onClick={onRetry}>
                        {retryLabel ?? "Retry"}
                      </Button>
                    )}
                  </div>
                </Panel>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 p-0.5">
              {copyText != null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={e => void handleCopy(e.currentTarget)}
                  aria-live="polite"
                  type="button"
                  aria-label={
                    copied
                      ? copiedLabel != null
                        ? String(copiedLabel)
                        : "Copied"
                      : copyLabel != null
                        ? String(copyLabel)
                        : "Copy"
                  }
                >
                  {copied ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {copiedLabel ?? "Copied!"}
                    </span>
                  ) : (
                    (copyLabel ?? "Copy")
                  )}
                </Button>
              )}
              {secondaryActions}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </article>
    );
  }

  return (
    <article aria-label={articleLabel} className={cn("group", className)}>
      <Collapsible
        open={effectiveOpen}
        onOpenChange={handleOpenChange}
        className={cn("flex gap-3", isUser && "flex-row-reverse")}
      >
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            avatarRingClass(role),
          )}
          aria-hidden
        >
          {avatar ?? defaultAvatarLetter(role)}
        </div>

        <div
          className={cn(
            "flex max-w-[85%] flex-col gap-2",
            isUser && "items-end",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={roleBadgeVariant(role)} size="sm">
              {roleLabel}
            </Badge>
            {timestamp != null && ts}
            {isLatest && latestLabel != null && (
              <Badge variant="success" size="sm">
                {latestLabel}
              </Badge>
            )}
            {collapsible && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-6 px-2 text-xs"
                  type="button"
                >
                  {open ? collapseLabels.open : collapseLabels.closed}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          <CollapsibleContent>
            <Card
              variant="surface"
              className={cn(
                "rounded-xl border border-line p-4",
                bubbleBgClass(role),
                bubbleRing,
              )}
            >
              <div className="prose prose-compact dark:prose-invert max-w-none">
                {children}
              </div>

              {error != null && (
                <Panel className="mt-2 rounded-lg bg-error/10 p-3 text-text">
                  <div className="flex items-center justify-between gap-2">
                    <Span className="text-sm">{error}</Span>
                    {onRetry != null && (
                      <Button variant="ghost" size="sm" onClick={onRetry}>
                        {retryLabel ?? "Retry"}
                      </Button>
                    )}
                  </div>
                </Panel>
              )}
            </Card>

            <div
              className={cn(
                "flex items-center gap-2 p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                isUser && "flex-row-reverse",
              )}
            >
              {copyText != null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={e => void handleCopy(e.currentTarget)}
                  aria-live="polite"
                  type="button"
                  aria-label={
                    copied
                      ? copiedLabel != null
                        ? String(copiedLabel)
                        : "Copied"
                      : copyLabel != null
                        ? String(copyLabel)
                        : "Copy"
                  }
                >
                  {copied ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {copiedLabel ?? "Copied!"}
                    </span>
                  ) : (
                    (copyLabel ?? "Copy")
                  )}
                </Button>
              )}
              {secondaryActions}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </article>
  );
}
