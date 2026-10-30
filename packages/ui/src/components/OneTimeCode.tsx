import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../utils";
import { Button } from "./Button";
import { copyTextToClipboard } from "./chat/clipboard";

export const COPIED_RESET_MS = 2000;

/** A one-time code shown large enough to read and type, with a copy button. */
export function OneTimeCode({
  value,
  copyLabel,
  copiedLabel,
  copied: copiedProp = false,
  className,
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
  /** Start in the "copied" state, e.g. when the caller already put the code on the clipboard. */
  copied?: boolean;
  className?: string;
}) {
  // "Copied" is a short confirmation, not a permanent state: it reverts after a moment so the
  // button keeps looking usable, and every successful copy restarts the timer.
  const [copied, setCopied] = useState(copiedProp);
  const [copyCount, setCopyCount] = useState(0);
  const confirm = () => {
    setCopied(true);
    setCopyCount(n => n + 1);
  };

  useEffect(() => {
    if (copiedProp) confirm();
    else setCopied(false);
  }, [copiedProp, value]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(id);
  }, [copied, copyCount]);

  return (
    <div
      className={cn(
        "border-line bg-raised flex items-center justify-between gap-3 rounded-xl border py-2 pl-4 pr-2",
        className,
      )}>
      <span className="text-text select-all whitespace-nowrap font-mono text-lg font-semibold tracking-[0.12em]">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0"
        onClick={() => {
          void copyTextToClipboard(value).then(ok => {
            if (ok) confirm();
          });
        }}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}
