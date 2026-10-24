import { Button } from './Button';
import { CodeBlock } from './CodeBlock';
import { copyTextToClipboard } from './chat/clipboard';
import { Small } from './Typography';
import { useEffect, useState, type ComponentProps } from 'react';

export function CopyRow({
  label,
  copyLabel,
  value,
}: {
  label: string;
  copyLabel: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Small>{label}</Small>
      <CodeBlock className="bg-surface-200 dark:bg-dark-surface-300 rounded-lg px-3 py-2 whitespace-pre-wrap break-all">
        {value}
      </CodeBlock>
      <CopyValueButton value={value} label={copyLabel} />
    </div>
  );
}

export function CopyValueButton({
  value,
  label,
  size = 'sm',
  className = 'self-start',
}: {
  value: string;
  label: string;
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
      {copied ? 'Copied' : label}
    </Button>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-surface-200 dark:bg-dark-surface-300 rounded px-1.5 py-0.5 font-mono">
      {children}
    </code>
  );
}
