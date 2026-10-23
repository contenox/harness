import { describe, expect, it } from 'vitest';
import { WebSocketTransport, type TransportClose, type WebSocketLike } from './transport';


class FakeSocket implements WebSocketLike {
  readyState = 1;
  readonly sent: string[] = [];
  closeCalls = 0;
  private readonly listeners = new Map<string, Array<(ev: never) => void>>();

  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closeCalls++;
  }
  addEventListener(type: string, listener: (ev: never) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }
  emit(type: string, ev?: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      (listener as (ev: unknown) => void)(ev);
    }
  }
}

function transportOver(socket: FakeSocket): WebSocketTransport {
  return new WebSocketTransport('wss://relay.example/v1/instances/inst-1/attach', {
    WebSocketImpl: class {
      constructor() {
        return socket as unknown as WebSocketLike;
      }
    } as unknown as new () => WebSocketLike,
  });
}

describe('WebSocketTransport close reporting', () => {
  it('carries the peer’s close code and reason to every close callback', () => {
    const socket = new FakeSocket();
    const transport = transportOver(socket);
    const seen: Array<TransportClose | undefined> = [];
    transport.onClose((_err, close) => seen.push(close));
    transport.onClose((_err, close) => seen.push(close));

    socket.emit('close', { code: 4403, reason: 'access to this account was revoked' });

    expect(seen).toEqual([
      { code: 4403, reason: 'access to this account was revoked' },
      { code: 4403, reason: 'access to this account was revoked' },
    ]);
  });

  it('reports "no status received" when the peer sent no code', () => {
    const socket = new FakeSocket();
    const transport = transportOver(socket);
    let seen: TransportClose | undefined;
    transport.onClose((_err, close) => {
      seen = close;
    });

    socket.emit('close', {});

    expect(seen).toEqual({ code: 1005, reason: '' });
  });

  it('fires close exactly once', () => {
    const socket = new FakeSocket();
    const transport = transportOver(socket);
    let fired = 0;
    transport.onClose(() => {
      fired++;
    });

    socket.emit('close', { code: 1000, reason: '' });
    socket.emit('close', { code: 1006, reason: '' });

    expect(fired).toBe(1);
  });

  it('still calls a callback that only takes the error', () => {
    const socket = new FakeSocket();
    const transport = transportOver(socket);
    let fired = false;
    transport.onClose((_err?: Error) => {
      fired = true;
    });

    socket.emit('close', { code: 4403, reason: 'access to this account was revoked' });

    expect(fired).toBe(true);
  });
});
