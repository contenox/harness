import { forwardRef, useEffect, useRef } from "react";
import { cn } from "../utils";
import { sanitizeTerminalText } from "../ansi";

export interface TerminalOutputProps
  extends React.HTMLAttributes<HTMLDivElement> {
  lines: string[];
  autoScroll?: boolean;
  title?: string;
  actions?: React.ReactNode;
  maxHeight?: string;
}

export const TerminalOutput = forwardRef<HTMLDivElement, TerminalOutputProps>(
  function TerminalOutput(
    {
      className,
      lines,
      autoScroll = true,
      title,
      actions,
      maxHeight = "100%",
      ...props
    },
    ref,
  ) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [lines, autoScroll]);

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border",
          "border-surface-300 dark:border-dark-surface-500",
          "bg-surface-900 dark:bg-dark-surface-50",
          "text-surface-100 dark:text-dark-text",
          className,
        )}
        style={{ maxHeight }}
        {...props}
      >

        {(title || actions) && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5",
              "border-surface-700 dark:border-dark-surface-300",
              "bg-surface-800 dark:bg-dark-surface-100",
            )}
          >
            {title && (
              <span className="text-xs font-medium text-surface-300 dark:text-dark-text-muted">
                {title}
              </span>
            )}
            {actions && <div className="flex items-center gap-1">{actions}</div>}
          </div>
        )}


        <div
          ref={scrollRef}
          className="flex-1 overflow-auto p-3"
        >
          <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-5">
            {lines.map((line, i) => (
              <div key={i}>
                {colorize(line)}
                {"\n"}
              </div>
            ))}
          </pre>
        </div>
      </div>
    );
  },
);





const ANSI_CLASSES: Record<string, string> = {

  "30": "text-surface-600 dark:text-dark-surface-900",
  "31": "text-error-400 dark:text-dark-error",
  "32": "text-success dark:text-dark-success",
  "33": "text-warning dark:text-dark-warning",
  "34": "text-primary-300 dark:text-dark-primary",
  "35": "text-accent-400 dark:text-dark-accent",
  "36": "text-info-300 dark:text-dark-info",
  "37": "text-surface-100 dark:text-dark-text",
  "1": "font-bold",
  "2": "opacity-60",
  "3": "italic",
  "4": "underline",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ANSI_RE = /\x1b\[([0-9;]*)m/g;

function colorize(rawText: string): React.ReactNode {



  const text = sanitizeTerminalText(rawText);
  if (!text.includes("\x1b[")) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let activeClasses = "";
  let match: RegExpExecArray | null;


  ANSI_RE.lastIndex = 0;

  while ((match = ANSI_RE.exec(text)) !== null) {

    if (match.index > lastIndex) {
      const chunk = text.slice(lastIndex, match.index);
      parts.push(
        activeClasses ? (
          <span key={parts.length} className={activeClasses}>
            {chunk}
          </span>
        ) : (
          chunk
        ),
      );
    }
    lastIndex = match.index + match[0].length;

    const codes = match[1].split(";");
    for (const code of codes) {
      if (code === "0" || code === "") {
        activeClasses = "";
      } else if (ANSI_CLASSES[code]) {
        activeClasses = activeClasses
          ? `${activeClasses} ${ANSI_CLASSES[code]}`
          : ANSI_CLASSES[code];
      }
    }
  }


  if (lastIndex < text.length) {
    const chunk = text.slice(lastIndex);
    parts.push(
      activeClasses ? (
        <span key={parts.length} className={activeClasses}>
          {chunk}
        </span>
      ) : (
        chunk
      ),
    );
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
