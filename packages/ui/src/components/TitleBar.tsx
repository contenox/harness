import type { CSSProperties, ReactNode } from "react";
import { cn } from "../utils";

export type TitleBarProps = {
  /** Leading controls (sidebar toggle, back/forward). */
  start?: ReactNode;
  /** Title area; grows and truncates. */
  children?: ReactNode;
  /** Trailing controls (pane toggles, status). */
  end?: ReactNode;
  /** Pixels kept free on the left (e.g. macOS traffic lights). */
  reserveStart?: number;
  /** Pixels kept free on the right (e.g. Windows caption buttons). */
  reserveEnd?: number;
  className?: string;
};

const DRAG = "[-webkit-app-region:drag]";
const NO_DRAG = "[-webkit-app-region:no-drag]";

/**
 * Window title bar / top bar. The bar itself is a draggable region for frameless
 * desktop windows; every slot that holds controls opts out of dragging.
 */
export function TitleBar({
  start,
  children,
  end,
  reserveStart = 0,
  reserveEnd = 0,
  className,
}: TitleBarProps) {
  const style: CSSProperties = { paddingLeft: 12 + reserveStart, paddingRight: 12 + reserveEnd };
  return (
    <header
      style={style}
      className={cn(
        "flex h-12 shrink-0 select-none items-center gap-2 border-b border-line bg-app",
        DRAG,
        className,
      )}
    >
      {start && <div className={cn("flex shrink-0 items-center gap-1", NO_DRAG)}>{start}</div>}
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      {end && <div className={cn("flex min-w-0 shrink items-center gap-2", NO_DRAG)}>{end}</div>}
    </header>
  );
}
