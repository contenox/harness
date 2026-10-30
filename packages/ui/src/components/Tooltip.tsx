import { ReactNode, useEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils";

type TooltipProps = {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  delay?: number;
};

const positionClasses: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "-translate-x-1/2 -translate-y-full",
  bottom: "-translate-x-1/2",
  left: "-translate-x-full -translate-y-1/2",
  right: "-translate-y-1/2",
};

/** Small inverted tooltip. */
export function Tooltip({
  content,
  children,
  position = "top",
  className,
  delay = 300,
}: TooltipProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const tooltipId = useId();
  const show = coords !== null;

  const scheduleShow = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 6;
      switch (position) {
        case "top":
          setCoords({ top: rect.top - gap, left: rect.left + rect.width / 2 });
          break;
        case "bottom":
          setCoords({
            top: rect.bottom + gap,
            left: rect.left + rect.width / 2,
          });
          break;
        case "left":
          setCoords({ top: rect.top + rect.height / 2, left: rect.left - gap });
          break;
        case "right":
          setCoords({
            top: rect.top + rect.height / 2,
            left: rect.right + gap,
          });
          break;
      }
    }, delay);
  };

  const hide = () => {
    window.clearTimeout(timerRef.current);
    setCoords(null);
  };

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <div className="relative inline-block" ref={wrapperRef}>
      <div
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onFocus={scheduleShow}
        onBlur={hide}
        onKeyDown={(e) => {
          if (e.key === "Escape") hide();
        }}
        aria-describedby={show ? tooltipId : undefined}
      >
        {children}
      </div>
      {show &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className={cn(
              "pointer-events-none fixed z-[60] max-w-xs rounded-md px-2 py-1 text-xs font-medium",
              "bg-solid text-on-solid",
              positionClasses[position],
              className,
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  );
}
