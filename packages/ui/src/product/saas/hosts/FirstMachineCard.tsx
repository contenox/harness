import { Card, CodeBlock, P, Small } from '@contenox/ui';
import { CopyValueButton, InlineCode } from '@contenox/ui';


const INSTALL_COMMAND = 'curl -fsSL https://contenox.com/install.sh | sh';


const QUICKSTART_URL = 'https://contenox.com/docs/guide/quickstart/';

/**
 * What the Hosts screen shows a fresh account instead of an empty list: the whole path from nothing installed to a paired machine, on one card.
 */
export function FirstMachineCard() {
  return (
    <Card variant="filled" className="flex flex-col gap-5">
      <div>
        <P className="font-medium">Set up your first machine</P>
        <Small>
          Pair a machine you control and its agent sessions become reachable from this app.
        </Small>
      </div>

      <Step number={1} title="Install the runtime on the machine you want to reach">
        <div className="flex flex-col gap-2">
          {/* Wrapped, not scrolled: this line is read off a phone and typed
              into a machine — the same brief as the pairing key above — and a
              command clipped mid-URL transcribes as a command that does
              nothing. */}
          <CodeBlock className="bg-surface-200 dark:bg-dark-surface-300 rounded-lg px-3 py-2 whitespace-pre-wrap break-all">
            {INSTALL_COMMAND}
          </CodeBlock>
          <CopyValueButton value={INSTALL_COMMAND} label="Copy the install command" />
          <Small>
            Windows and the manual install are in the{' '}
            <a
              href={QUICKSTART_URL}
              target="_blank"
              rel="noreferrer"
              className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
              install docs
            </a>
            . The runtime is open source.
          </Small>
        </div>
      </Step>

      <Step number={2} title="Start a session on it">
        <Small>
          Run <InlineCode>contenox setup</InlineCode> once to connect a model, then open a session
          from Zed, JetBrains, AionUi or any other editor that speaks ACP.
        </Small>
      </Step>

      <Step number={3} title="Pair it with this account">
        <Small>
          In that session, run <InlineCode>/pair</InlineCode> and type a key from the panel above.
          The machine appears here the moment the key is redeemed.
        </Small>
      </Step>
    </Card>
  );
}


function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div
        aria-hidden
        className="bg-surface-200 dark:bg-dark-surface-300 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        {number}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <P className="text-sm font-medium">{title}</P>
        {children}
      </div>
    </div>
  );
}
