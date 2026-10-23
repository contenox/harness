import { useEffect, useState } from 'react';

export interface Deadline {
  atMs: number;
}

export function deadlineFromMint(
  mint: { expires_at: string; expires_in: number },
  nowMs: number,
): Deadline {
  if (Number.isFinite(mint.expires_in) && mint.expires_in > 0) {
    return { atMs: nowMs + mint.expires_in * 1000 };
  }
  const absolute = Date.parse(mint.expires_at);
  return { atMs: Number.isNaN(absolute) ? nowMs : absolute };
}

export function formatRemaining(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  return `${Math.floor(clamped / 60)}:${(clamped % 60).toString().padStart(2, '0')}`;
}

export function useCountdown(deadline: Deadline | null): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (deadline === null) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline.atMs - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
}
