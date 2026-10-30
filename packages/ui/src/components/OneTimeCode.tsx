import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../utils";
import { Button } from "./Button";
import { copyTextToClipboard } from "./chat/clipboard";

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
  const [copied, setCopied] = useState(copiedProp);

  useEffect(() => setCopied(copiedProp), [copiedProp, value]);

  return (
    <div
      className={cn(
        "border-line bg-raised flex items-center justify-between gap-3 rounded-xl border py-2 pl-4 pr-2",
        className,
      )}>
      <span className="text-text select-all font-mono text-xl font-semibold tracking-[0.18em]">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          void copyTextToClipboard(value).then(setCopied);
        }}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}
