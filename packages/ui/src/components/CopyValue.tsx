import { Button } from './Button';
import { CodeBlock } from './CodeBlock';
import { copyTextToClipboard } from './chat/clipboard';
import { Small } from './Typography';
import { useEffect, useState, type ComponentProps } from 'react';

export function CopyRow({
  label,
  copyLabel,
  copiedLabel,
  value,
}: {
  label: string;
  copyLabel: string;
  /** Shown briefly after copying. Defaults to "Copied". */
  copiedLabel?: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Small>{label}</Small>
      <CodeBlock className="rounded-lg border border-line bg-sidebar px-3 py-2 whitespace-pre-wrap break-all">
        {value}
      </CodeBlock>
      <CopyValueButton value={value} label={copyLabel} copiedLabel={copiedLabel} />
    </div>
  );
}

export function CopyValueButton({
  value,
  label,
  copiedLabel = 'Copied',
  size = 'sm',
  className = 'self-start',
}: {
  value: string;
  label: string;
  /** Shown for two seconds after a successful copy. Defaults to "Copied". */
  copiedLabel?: string;
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      onClick={() => {
        void copyTextToClipboard(value).then(setCopied);
      }}>
      {copied ? copiedLabel : label}
    </Button>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-selected px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  );
}
