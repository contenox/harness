export const APPROVAL_META_KEY = "contenox.approval";

export interface ApprovalDecision {
  decidedBy: string;
  approved: boolean;
  note: string;
}

export function approvalDecisionFromMeta(
  meta: Record<string, unknown> | undefined | null,
): ApprovalDecision | null {
  if (!meta) return null;
  const raw = meta[APPROVAL_META_KEY];
  if (typeof raw !== "object" || raw === null) return null;
  const { decidedBy, approved, note } = raw as Record<string, unknown>;
  if (typeof approved !== "boolean") return null;
  return {
    decidedBy: typeof decidedBy === "string" ? decidedBy : "",
    approved,
    note: typeof note === "string" ? note : "",
  };
}
