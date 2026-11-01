import '../../../test/fakeDomGlobals';
import { useChatScroll } from '@contenox/ui';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeNode, findAll, fireEvent, installFakeDom, type FakeDomHandle } from '../../../test/fakeDom';

let dom: FakeDomHandle;

beforeEach(() => {
  dom = installFakeDom();
});
afterEach(() => {
  dom.uninstall();
  vi.restoreAllMocks();
});

let scrollToEnd = () => {};

function Probe({ show, tick }: { show: boolean; tick: number }) {
  const scroll = useChatScroll({ deps: [tick] });
  scrollToEnd = scroll.scrollToEnd;
  return show ? (
    <div ref={scroll.containerRef} data-testid="scroll">
      <div ref={scroll.endRef} />
    </div>
  ) : (
    <div data-testid="empty" />
  );
}

async function renderProbe(show: boolean, tick: number) {
  const root = createRoot(dom.container as unknown as Element);
  await act(async () => root.render(createElement(Probe, { show, tick })));
  return root;
}

function scrollNode(): FakeNode {
  const node = findAll(dom.container, n => n.getAttribute?.('data-testid') === 'scroll')[0];
  expect(node).toBeDefined();
  return node;
}

describe('useChatScroll', () => {
  it('attaches the scroll listener once the empty chat gets its first message and respects scroll-up', async () => {
    const follow = vi.spyOn(FakeNode.prototype, 'scrollIntoView');
    const root = await renderProbe(false, 0);
    await act(async () => root.render(createElement(Probe, { show: true, tick: 1 })));

    const el = scrollNode();
    el.scrollHeight = 1000;
    el.clientHeight = 100;
    el.scrollTop = 0;
    await act(async () => fireEvent(dom.container, el, 'scroll'));
    follow.mockClear();

    await act(async () => root.render(createElement(Probe, { show: true, tick: 2 })));
    expect(follow).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it('does not treat its own smooth scroll-to-latest as the reader scrolling away', async () => {
    const follow = vi.spyOn(FakeNode.prototype, 'scrollIntoView');
    const root = await renderProbe(true, 0);
    const el = scrollNode();
    el.scrollHeight = 1000;
    el.clientHeight = 100;
    el.scrollTop = 900;

    await act(async () => scrollToEnd());
    expect(follow).toHaveBeenLastCalledWith({ behavior: 'smooth' });
    follow.mockClear();

    // Scroll events fired while the smooth animation is short of the bottom.
    el.scrollTop = 0;
    await act(async () => fireEvent(dom.container, el, 'scroll'));
    await act(async () => root.render(createElement(Probe, { show: true, tick: 1 })));
    expect(follow).toHaveBeenCalledWith({ behavior: 'auto' });
    await act(async () => root.unmount());
  });
});
