import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { Badge, Button, cn, Dialog, P } from '@contenox/ui';
import { Eye, RotateCw, TerminalSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safeFit } from './terminalFit';
import {
  buildTerminalWsUrl,
  createHostTerminalBridge,
  TERMINAL_READ_ONLY_DEFAULT,
  type HostTerminalBridge,
} from '../../lib/hostTerminal';

type ConnState = 'connecting' | 'open' | 'closed';

export interface TerminalViewProps {
  wsPath: string;
  className?: string;
}

export function TerminalView({ wsPath, className }: TerminalViewProps) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const bridgeRef = useRef<HostTerminalBridge | null>(null);
  const [readOnly, setReadOnly] = useState(TERMINAL_READ_ONLY_DEFAULT);
  const [conn, setConn] = useState<ConnState>('connecting');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      disableStdin: TERMINAL_READ_ONLY_DEFAULT,
      cursorBlink: !TERMINAL_READ_ONLY_DEFAULT,
      convertEol: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      scrollback: 5000,
    });
    let disposed = false;
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    termRef.current = term;
    setReadOnly(TERMINAL_READ_ONLY_DEFAULT);
    term.options.disableStdin = TERMINAL_READ_ONLY_DEFAULT;

    setConn('connecting');
    const socket = new WebSocket(buildTerminalWsUrl(wsPath));
    socket.binaryType = 'arraybuffer';
    const bridge = createHostTerminalBridge(term, socket, {
      readOnly: TERMINAL_READ_ONLY_DEFAULT,
    });
    bridgeRef.current = bridge;

    const sendFit = () => {
      if (!safeFit(host, disposed, () => fit.fit())) return;
      try {
        bridge.sendResize(term.cols, term.rows);
      } catch {
      }
    };

    socket.addEventListener('open', () => {
      if (disposed) return;
      setConn('open');
      sendFit();
    });
    socket.addEventListener('close', () => {
      if (!disposed) setConn('closed');
    });
    socket.addEventListener('error', () => {
      if (!disposed) setConn('closed');
    });

    // Defer the first fit until the renderer and layout exist.
    let raf = requestAnimationFrame(() => {
      raf = 0;
      sendFit();
    });
    const ro = new ResizeObserver(() => {
      if (disposed) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        sendFit();
      });
    });
    ro.observe(host);

    return () => {
      disposed = true;
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      bridge.dispose();
      try {
        socket.close();
      } catch {
      }
      // xterm's viewport schedules work on open; disposing in the same tick (effect re-run, strict
      // mode, takeover remount) makes that work hit a torn-down renderer. Dispose a tick later.
      window.setTimeout(() => {
        try {
          term.dispose();
        } catch {
        }
      }, 0);
      termRef.current = null;
      bridgeRef.current = null;
    };
  }, [wsPath, reconnectNonce]);

  const takeOver = () => {
    setConfirmOpen(false);
    setReadOnly(false);
    const term = termRef.current;
    if (term) {
      term.options.disableStdin = false;
      term.focus();
    }
    bridgeRef.current?.setReadOnly(false);
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          {readOnly ? (
            <Badge variant="secondary" size="sm" className="inline-flex items-center gap-1">
              <Eye aria-hidden="true" className="h-3 w-3" />
              {t('hostTerminal.read_only_badge')}
            </Badge>
          ) : (
            <Badge variant="warning" size="sm" className="inline-flex items-center gap-1">
              <TerminalSquare aria-hidden="true" className="h-3 w-3" />
              {t('hostTerminal.interactive_badge')}
            </Badge>
          )}
          <span className="text-text-muted dark:text-dark-text-muted text-xs">
            {conn === 'open'
              ? readOnly
                ? t('hostTerminal.read_only_hint')
                : ''
              : conn === 'connecting'
                ? t('hostTerminal.connecting')
                : t('hostTerminal.disconnected')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {conn === 'closed' && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setReconnectNonce(n => n + 1)}>
              <RotateCw aria-hidden="true" className="mr-1 h-3 w-3" />
              {t('hostTerminal.reconnect')}
            </Button>
          )}
          {readOnly && (
            <Button
              type="button"
              variant="outline"
              palette="neutral"
              size="xs"
              onClick={() => setConfirmOpen(true)}>
              {t('hostTerminal.take_over')}
            </Button>
          )}
        </div>
      </div>


      <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden bg-black p-1" />

      {confirmOpen && (
        <Dialog
          open
          onClose={() => setConfirmOpen(false)}
          title={t('hostTerminal.take_over_confirm_title')}
          className="w-[min(34rem,90vw)]">
          <P>{t('hostTerminal.take_over_confirm_body')}</P>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              palette="neutral"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setConfirmOpen(false)}>
              {t('hostTerminal.take_over_confirm_cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="w-full sm:w-auto"
              onClick={takeOver}>
              {t('hostTerminal.take_over_confirm_confirm')}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
