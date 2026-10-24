import type { ReactNode } from "react";
import { cn } from "../utils";

export type TabPanelProps<T extends string = string> = {
  tabId: T;
  activeTab: T;
  children: ReactNode;
  className?: string;

  lazy?: boolean;
};

export function TabPanel<T extends string = string>({
  tabId,
  activeTab,
  children,
  className,
  lazy = false,
}: TabPanelProps<T>) {
  const isActive = activeTab === tabId;
  if (lazy && !isActive) {
    return null;
  }
  return (
    <div
      id={`panel-${String(tabId)}`}
      role="tabpanel"
      aria-labelledby={`tab-${String(tabId)}`}
      hidden={!isActive}
      className={cn(isActive && "flex min-h-0 flex-1 flex-col", className)}
    >
      {children}
    </div>
  );
}

export function TabPanels({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>{children}</div>
  );
}
