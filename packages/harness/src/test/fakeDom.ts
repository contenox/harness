/**
 * A deliberately tiny DOM, just enough for react-dom/client to mount, update and dispatch events
 * to a component tree under vitest's node environment (the repo ships no jsdom / happy-dom).
 * It exists for render-count regression tests, not for asserting layout.
 */
type Listener = { fn: (e: unknown) => void; capture: boolean };

export class FakeNode {
  nodeType = 1;
  nodeName = '';
  tagName = '';
  namespaceURI = 'http://www.w3.org/1999/xhtml';
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  ownerDocument!: FakeDocument;
  attributes: Record<string, string> = {};
  listeners: Record<string, Listener[]> = {};
  style: Record<string, unknown> & {
    setProperty: (k: string, v: string) => void;
    removeProperty: (k: string) => void;
  } = {
    setProperty(k, v) {
      this[k] = v;
    },
    removeProperty(k) {
      delete this[k];
    },
  };
  nodeValue: string | null = null;
  private _text = '';
  value = '';
  defaultValue = '';
  selectionStart = 0;
  selectionEnd = 0;
  scrollTop = 0;
  scrollHeight = 0;
  clientHeight = 0;
  [key: string]: unknown;

  get firstChild() {
    return this.childNodes[0] ?? null;
  }
  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling(): FakeNode | null {
    const sibs = this.parentNode?.childNodes;
    if (!sibs) return null;
    return sibs[sibs.indexOf(this) + 1] ?? null;
  }
  get textContent(): string {
    if (this.nodeType === 3) return this.nodeValue ?? '';
    return this.childNodes.length ? this.childNodes.map(c => c.textContent).join('') : this._text;
  }
  set textContent(v: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    this._text = v;
    if (this.nodeType === 3) this.nodeValue = v;
  }
  appendChild(child: FakeNode) {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  insertBefore(child: FakeNode, before: FakeNode | null) {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    const i = before ? this.childNodes.indexOf(before) : -1;
    if (i < 0) this.childNodes.push(child);
    else this.childNodes.splice(i, 0, child);
    return child;
  }
  removeChild(child: FakeNode) {
    const i = this.childNodes.indexOf(child);
    if (i >= 0) this.childNodes.splice(i, 1);
    child.parentNode = null;
    return child;
  }
  contains(other: FakeNode | null): boolean {
    for (let n: FakeNode | null = other; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  setAttribute(k: string, v: unknown) {
    this.attributes[k] = String(v);
  }
  setAttributeNS(_ns: string | null, k: string, v: unknown) {
    this.attributes[k] = String(v);
  }
  getAttribute(k: string) {
    return this.attributes[k] ?? null;
  }
  removeAttribute(k: string) {
    delete this.attributes[k];
  }
  hasAttribute(k: string) {
    return k in this.attributes;
  }
  addEventListener(type: string, fn: (e: unknown) => void, opts?: boolean | { capture?: boolean }) {
    const capture = typeof opts === 'boolean' ? opts : !!opts?.capture;
    (this.listeners[type] ??= []).push({ fn, capture });
  }
  removeEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter(l => l.fn !== fn);
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  blur() {
    this.ownerDocument.activeElement = this.ownerDocument.body;
  }
  getBoundingClientRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
  scrollIntoView() {}
  getRootNode() {
    return this.ownerDocument;
  }
}

export class FakeDocument extends FakeNode {
  documentElement: FakeNode;
  body: FakeNode;
  activeElement: FakeNode;
  defaultView: unknown = null;
  // react-dom probes `'oninput' in document` once at import time to pick its change-event strategy.
  oninput = null;
  cookie = '';
  constructor() {
    super();
    this.nodeType = 9;
    this.ownerDocument = this;
    this.documentElement = this.createElement('html');
    this.body = this.createElement('body');
    this.activeElement = this.body;
  }
  createElement(tag: string) {
    const n = new FakeNode();
    n.ownerDocument = this;
    n.nodeName = n.tagName = tag.toUpperCase();
    return n;
  }
  createElementNS(ns: string, tag: string) {
    const n = this.createElement(tag);
    n.namespaceURI = ns;
    n.nodeName = n.tagName = tag;
    return n;
  }
  createTextNode(text: string) {
    const n = this.createElement('#text');
    n.nodeType = 3;
    n.nodeValue = text;
    return n;
  }
  createComment(text: string) {
    const n = this.createElement('#comment');
    n.nodeType = 8;
    n.nodeValue = text;
    return n;
  }
}

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
}

export interface FakeDomHandle {
  container: FakeNode;
  document: FakeDocument;
  uninstall: () => void;
}

/** Installs `window` / `document` / `navigator` globals; returns a fresh container and a teardown. */
export function installFakeDom(): FakeDomHandle {
  const document = new FakeDocument();
  const win = {
    document,
    event: undefined,
    navigator: { userAgent: 'node', language: 'en', languages: ['en'] },
    location: { search: '', hash: '', pathname: '/', href: 'http://localhost/', origin: 'http://localhost', hostname: 'localhost', protocol: 'http:' },
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    addEventListener() {},
    removeEventListener() {},
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    HTMLIFrameElement: class {},
    HTMLElement: FakeNode,
    Element: FakeNode,
    Node: FakeNode,
  };
  document.defaultView = win;
  const g = globalThis as Record<string, unknown>;
  const prev = {
    window: g.window,
    document: g.document,
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
  };
  g.window = win;
  g.document = document;
  g.localStorage = win.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true, writable: true });
  g.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  return {
    container,
    document,
    uninstall() {
      g.window = prev.window;
      g.document = prev.document;
      if (prev.navigator) Object.defineProperty(globalThis, 'navigator', prev.navigator);
      delete g.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}

function dispatch(container: FakeNode, target: FakeNode, type: string, init: Record<string, unknown> = {}) {
  const native = {
    type,
    target,
    currentTarget: container,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    timeStamp: Date.now(),
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {},
    isTrusted: true,
    ...init,
  };
  const all = container.listeners[type] ?? [];
  for (const l of all.filter(l => l.capture)) l.fn(native);
  for (const l of all.filter(l => !l.capture)) l.fn(native);
}

/** Types `text` into a controlled textarea one character at a time (keydown, input, keyup each). */
export function typeInto(container: FakeNode, textarea: FakeNode, text: string, wrap: (fn: () => void) => void) {
  for (const ch of text) {
    wrap(() => dispatch(container, textarea, 'keydown', { key: ch }));
    const next = textarea.value + ch;
    textarea.value = next;
    textarea.selectionStart = textarea.selectionEnd = next.length;
    wrap(() => dispatch(container, textarea, 'input', { data: ch }));
    wrap(() => dispatch(container, textarea, 'keyup', { key: ch }));
  }
}

export function findAll(root: FakeNode, pred: (n: FakeNode) => boolean, out: FakeNode[] = []): FakeNode[] {
  if (pred(root)) out.push(root);
  for (const c of root.childNodes) findAll(c, pred, out);
  return out;
}
