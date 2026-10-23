import type { ReactNode } from "react";

export type ChatRole = "user" | "assistant" | "system" | "tool";

export type PendingApproval = {
  approvalId: string;
  hookName: string;
  toolName: string;
  args: Record<string, unknown>;
  diff: string;
};

export type ChatMessageBaseProps = {
  role: ChatRole;

  roleLabel: ReactNode;

  children: ReactNode;

  avatar?: ReactNode;

  timestamp?: ReactNode;

  timestampTooltip?: string;
  isLatest?: boolean;

  latestLabel?: ReactNode;

  highlightLatest?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  collapsible?: boolean;

  error?: ReactNode;
  onRetry?: () => void;
  retryLabel?: ReactNode;
  collapseToggleLabel?: { open: ReactNode; closed: ReactNode };

  secondaryActions?: ReactNode;

  copyText?: string;
  copyLabel?: ReactNode;
  copiedLabel?: ReactNode;
  className?: string;

  "aria-label"?: string;

  appearance?: "bubble" | "transcript";
};
