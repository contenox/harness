export interface Transport {
  send(text: string): void;
  onMessage(cb: (text: string) => void): void;
  onClose(cb: (err?: Error, close?: TransportClose) => void): void;
  close(): void;
}

export interface TransportClose {
  code: number;
  reason: string;
}

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'open', listener: () => void): void;
  addEventListener(type: 'message', listener: (ev: { data: unknown }) => void): void;
  addEventListener(type: 'close', listener: (ev: { code?: number; reason?: string }) => void): void;
  addEventListener(type: 'error', listener: (ev: unknown) => void): void;
}

export interface WebSocketConstructorLike {
  new (url: string, protocols?: string | string[]): WebSocketLike;
}

export interface WebSocketTransportOptions {
  protocols?: string | string[];
  WebSocketImpl?: WebSocketConstructorLike;
}

const READY_STATE_OPEN = 1;


const CLOSE_NO_STATUS = 1005;

export class WebSocketTransport implements Transport {
  private readonly ws: WebSocketLike;
  private readonly messageCbs: Array<(text: string) => void> = [];
  private readonly closeCbs: Array<(err?: Error, close?: TransportClose) => void> = [];
  private readonly sendQueue: string[] = [];
  private closedFired = false;

  constructor(url: string, options: WebSocketTransportOptions = {}) {
    const Impl = options.WebSocketImpl ?? (globalThis as { WebSocket?: WebSocketConstructorLike }).WebSocket;
    if (!Impl) {
      throw new Error(
        'WebSocketTransport: no WebSocket implementation available (pass options.WebSocketImpl outside a browser)',
      );
    }
    this.ws = new Impl(url, options.protocols);

    this.ws.addEventListener('open', () => {
      const queued = this.sendQueue.splice(0, this.sendQueue.length);
      for (const text of queued) {
        this.ws.send(text);
      }
    });
    this.ws.addEventListener('message', (ev) => {
      const text = typeof ev.data === 'string' ? ev.data : String(ev.data);
      for (const cb of this.messageCbs) cb(text);
    });
    this.ws.addEventListener('close', ev => {
      this.fireClose(undefined, {
        code: ev.code ?? CLOSE_NO_STATUS,
        reason: ev.reason ?? '',
      });
    });
    this.ws.addEventListener('error', () => {
    });
  }

  send(text: string): void {
    if (this.ws.readyState !== READY_STATE_OPEN) {
      this.sendQueue.push(text);
      return;
    }
    this.ws.send(text);
  }

  onMessage(cb: (text: string) => void): void {
    this.messageCbs.push(cb);
  }

  onClose(cb: (err?: Error, close?: TransportClose) => void): void {
    this.closeCbs.push(cb);
  }

  close(): void {
    this.ws.close();
  }

  private fireClose(err?: Error, close?: TransportClose): void {
    if (this.closedFired) return;
    this.closedFired = true;
    for (const cb of this.closeCbs) cb(err, close);
  }
}
