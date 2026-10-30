import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils";
import { Card } from "./Card";
import { Disclosure } from "./Disclosure";
import { H3, Small } from "./Typography";

export type RecoveryCardProps = {
  tone?: "error" | "warning" | "info";
  title: ReactNode;
  /** Explanatory text under the title. */
  children?: ReactNode;
  /** Buttons for the next step, e.g. retry / configure. */
  actions?: ReactNode;
  /** Raw technical output, revealed behind `detailsLabel`. Strings render monospaced. */
  details?: ReactNode;
  /** Toggle label for the details; required when `details` is set. */
  detailsLabel?: ReactNode;
  className?: string;
};

const toneConfig = {
  error: { Icon: CircleAlert, icon: "text-text-error", role: "alert" },
  warning: { Icon: TriangleAlert, icon: "text-text-warning", role: "status" },
  info: { Icon: Info, icon: "text-text-muted", role: "status" },
} as const;

/** A failure or blocked state that offers the next step instead of a dead end. */
export function RecoveryCard({
  tone = "error",
  title,
  children,
  actions,
  details,
  detailsLabel,
  className,
}: RecoveryCardProps) {
  const { Icon, icon, role } = toneConfig[tone];
  const hasDetails = details !== undefined && details !== null && details !== "";
  return (
    <Card role={role} data-tone={tone} className={cn("flex gap-3", className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", icon)} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <H3 className="text-sm">{title}</H3>
          {children && <Small>{children}</Small>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        {hasDetails && (
          <Disclosure label={detailsLabel}>
            {typeof details === "string" ? (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-sidebar p-3 font-mono text-xs text-text-muted">
                {details}
              </pre>
            ) : (
              details
            )}
          </Disclosure>
        )}
      </div>
    </Card>
  );
}
