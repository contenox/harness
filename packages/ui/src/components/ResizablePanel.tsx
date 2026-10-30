import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils";

type Orientation = "horizontal" | "vertical";

interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: Orientation;
}


export const ResizablePanelGroup = forwardRef<
  HTMLDivElement,
  ResizablePanelGroupProps
>(function ResizablePanelGroup(
  { className, orientation = "horizontal", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn(
        "flex min-h-0 min-w-0",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        className,
      )}
      {...props}
    />
  );
});



interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {

  defaultSize?: string;

  minSize?: number;

  maxSize?: number;
}

export const ResizablePanel = forwardRef<HTMLDivElement, ResizablePanelProps>(
  function ResizablePanel(
    { className, defaultSize, minSize, maxSize, style, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn(

          "min-h-0 min-w-0 overflow-hidden",
          className,
        )}
        style={{
          flexBasis: defaultSize,
          flexGrow: defaultSize ? 0 : 1,
          flexShrink: defaultSize ? 0 : 1,
          minWidth: minSize,
          maxWidth: maxSize,
          ...style,
        }}
        {...props}
      />
    );
  },
);



interface ResizablePanelHandleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: Orientation;
  onResize?: (delta: number) => void;

  onResizeEnd?: () => void;
}


export const ResizablePanelHandle = forwardRef<
  HTMLDivElement,
  ResizablePanelHandleProps
>(function ResizablePanelHandle(
  { className, orientation = "horizontal", onResize, onResizeEnd, ...props },
  ref,
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef(0);

  const assignRef = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [ref],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      lastPos.current =
        orientation === "horizontal" ? e.clientX : e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [orientation],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const current =
        orientation === "horizontal" ? e.clientX : e.clientY;
      const delta = current - lastPos.current;
      lastPos.current = current;

      const next = innerRef.current?.nextElementSibling as HTMLElement | null;
      if (next && delta !== 0) {
        const currentSize =
          orientation === "horizontal"
            ? next.getBoundingClientRect().width
            : next.getBoundingClientRect().height;
        const newSize = currentSize - delta;
        next.style.flexBasis = `${newSize}px`;
        next.style.flexGrow = "0";
        next.style.flexShrink = "0";
        onResize?.(delta);
      }
    },
    [dragging, orientation, onResize],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    onResizeEnd?.();
  }, [onResizeEnd]);

  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      setDragging(false);
      onResizeEnd?.();
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [dragging, onResizeEnd]);

  const isHorizontal = orientation === "horizontal";

  return (
    <div
      ref={assignRef}
      role="separator"
      aria-orientation={orientation}
      tabIndex={0}
      className={cn(
        // 1px visible line, wider invisible hit area (via the ::before).
        "group relative shrink-0 bg-line transition-colors",
        "hover:bg-line-strong",
        dragging && "bg-accent/60",
        isHorizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
        isHorizontal
          ? "before:absolute before:inset-y-0 before:-inset-x-1.5 before:content-['']"
          : "before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...props}
    />
  );
});
