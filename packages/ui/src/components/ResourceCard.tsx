import type { ReactNode } from "react";
import { cn } from "../utils";
import { Button } from "./Button";
import { ButtonGroup } from "./ButtonGroup";
import { Card } from "./Card";
import { H2 } from "./Typography";

interface ResourceCardProps {
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  status?: "default" | "success" | "error" | "warning";
  children: ReactNode;
  actions?: {
    edit?: () => void;
    delete?: () => void;
    custom?: ReactNode;
  };
  isLoading?: boolean;
  className?: string;
  actionLabels?: { edit: string; delete: string; deleting: string };
}

export function ResourceCard({
  title,
  subtitle,
  badge,
  status = "default",
  children,
  actions,
  isLoading = false,
  className = "",
  actionLabels = { edit: "Edit", delete: "Delete", deleting: "Deleting" },
}: ResourceCardProps) {
  return (
    <Card
      statusBorder={status === "default" ? undefined : status}
      className={cn("relative space-y-4", className)}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <H2 className="text-base break-words">{title}</H2>
          {subtitle && (
            <div className="text-[13px] text-text-muted">{subtitle}</div>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {children && <div className="space-y-4">{children}</div>}

      {actions && (
        <div className="border-t border-line pt-3">
          <ButtonGroup className="flex flex-wrap items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {actions.edit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={actions.edit}
                  disabled={isLoading}
                >
                  {actionLabels.edit}
                </Button>
              )}
              {actions.custom}
            </div>

            {actions.delete && (
              <Button
                variant="danger"
                size="sm"
                onClick={actions.delete}
                isLoading={isLoading}
              >
                {isLoading ? actionLabels.deleting : actionLabels.delete}
              </Button>
            )}
          </ButtonGroup>
        </div>
      )}
    </Card>
  );
}
