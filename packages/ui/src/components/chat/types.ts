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

  /**
   * "plain" is the Codex / Claude desktop look: the user's message is a subtle right-aligned bubble,
   * the assistant's is bare text. No avatar, role badge or "latest" badge.
   */
  appearance?: "bubble" | "transcript" | "plain";

  /** Plain appearance only: show `roleLabel` as a small muted label above an assistant message. */
  showRoleLabel?: boolean;
};
