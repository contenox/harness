
export const TERMINAL_READ_ONLY_DEFAULT = true;

export function resizeFrame(cols: number, rows: number): string {
  return JSON.stringify({ type: 'resize', cols, rows });
}

export interface LocationLike {
  protocol: string;
  host: string;
}

export function buildTerminalWsUrl(wsPath: string, location?: LocationLike): string {
  const loc =
    location ?? (typeof window !== 'undefined' ? window.location : undefined);
  if (!loc) {
    throw new Error('buildTerminalWsUrl: no location available (pass one outside a browser)');
  }
  const protocol = loc.protocol === 'https:' ? 'wss' : 'ws';
  const path = wsPath.startsWith('/') ? wsPath : `/${wsPath}`;
  return `${protocol}://${loc.host}${path}`;
}

export interface TerminalBridgeTerminal {
  onData(handler: (data: string) => void): { dispose(): void };
  write(data: string | Uint8Array): void;
}

export interface TerminalBridgeSocket {
  send(data: string | ArrayBufferLike | ArrayBufferView): void;
  addEventListener(type: 'message', listener: (ev: { data: unknown }) => void): void;
  removeEventListener(type: 'message', listener: (ev: { data: unknown }) => void): void;
}

export interface HostTerminalBridge {
  setReadOnly(readOnly: boolean): void;
  isReadOnly(): boolean;
  sendResize(cols: number, rows: number): void;
  dispose(): void;
}

export interface HostTerminalBridgeOptions {
  readOnly?: boolean;
}

export function createHostTerminalBridge(
  terminal: TerminalBridgeTerminal,
  socket: TerminalBridgeSocket,
  options: HostTerminalBridgeOptions = {},
): HostTerminalBridge {
  let readOnly = options.readOnly ?? TERMINAL_READ_ONLY_DEFAULT;

  const dataSub = terminal.onData(data => {
    if (readOnly) return;
    socket.send(data);
  });

  const onMessage = (ev: { data: unknown }) => {
    const payload = ev.data;
    if (typeof payload === 'string') {
      terminal.write(payload);
      return;
    }
    if (payload instanceof ArrayBuffer) {
      terminal.write(new Uint8Array(payload));
      return;
    }
    if (ArrayBuffer.isView(payload)) {
      terminal.write(new Uint8Array((payload as ArrayBufferView).buffer));
      return;
    }
    terminal.write(String(payload));
  };
  socket.addEventListener('message', onMessage);

  return {
    setReadOnly: value => {
      readOnly = value;
    },
    isReadOnly: () => readOnly,
    sendResize: (cols, rows) => socket.send(resizeFrame(cols, rows)),
    dispose: () => {
      dataSub.dispose();
      socket.removeEventListener('message', onMessage);
    },
  };
}
