import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { releaseNavbarSlot } from './NavbarSlot';

describe('releaseNavbarSlot — navbar slot single-owner set/clear', () => {
  it('clears the slot when the unmounting claimant still holds its own node', () => {
    const node = createElement('span', null, 'badge');
    expect(releaseNavbarSlot(node, node)).toBeNull();
  });

  it('does NOT stomp a newer owner when a stale claimant releases', () => {
    const older = createElement('span', null, 'A');
    const newer = createElement('span', null, 'B');
    expect(releaseNavbarSlot(newer, older)).toBe(newer);
  });

  it('models mount → mount → unmount → unmount: last mounter wins, cleared when the last leaves', () => {
    let slot: ReactNode = null;
    const claim = (node: ReactNode) => {
      slot = node;
    };
    const release = (claimed: ReactNode) => {
      slot = releaseNavbarSlot(slot, claimed);
    };

    const a = createElement('span', null, 'A');
    const b = createElement('span', null, 'B');

    claim(a);
    expect(slot).toBe(a);
    claim(b);
    expect(slot).toBe(b);
    release(a);
    expect(slot).toBe(b);
    release(b);
    expect(slot).toBeNull();
  });
});
