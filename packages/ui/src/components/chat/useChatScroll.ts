import { type DependencyList, useCallback, useEffect, useRef, useState } from "react";

export type UseChatScrollOptions = {
  deps: DependencyList;

  thresholdPx?: number;
  behavior?: ScrollBehavior;
};

export function useChatScroll({
  deps,
  thresholdPx = 160,
  behavior = "smooth",
}: UseChatScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const stickRef = useRef(true);
  // A smooth scroll-to-latest emits scroll events before it reaches the bottom.
  // Those must not be read as the reader scrolling away.
  const programmaticRef = useRef(false);
  const programmaticTimerRef = useRef<number | null>(null);
  const userIntentUntilRef = useRef(0);

  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
  }, [thresholdPx]);

  const clearProgrammatic = useCallback(() => {
    programmaticRef.current = false;
    if (programmaticTimerRef.current !== null) {
      window.clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = null;
    }
  }, []);

  const scrollToEnd = useCallback(() => {
    stickRef.current = true;
    programmaticRef.current = true;
    const el = containerRef.current;
    endRef.current?.scrollIntoView({ behavior });
    if (el) el.addEventListener("scrollend", clearProgrammatic, { once: true });
    if (programmaticTimerRef.current !== null) window.clearTimeout(programmaticTimerRef.current);
    // Older Chromium has no scrollend; the timer is the fallback.
    programmaticTimerRef.current = window.setTimeout(clearProgrammatic, 800);
  }, [behavior, clearProgrammatic]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const near = checkNearBottom();
      setIsNearBottom(near);
      if (programmaticRef.current) return;
      if (near) {
        stickRef.current = true;
        return;
      }
      if (Date.now() <= userIntentUntilRef.current) stickRef.current = false;
    };
    const handleUserScroll = () => {
      programmaticRef.current = false;
      userIntentUntilRef.current = Date.now() + 1000;
    };
    const handlePointerDown = () => {
      programmaticRef.current = false;
      userIntentUntilRef.current = Number.POSITIVE_INFINITY;
    };
    const handlePointerUp = () => {
      userIntentUntilRef.current = Date.now() + 300;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("wheel", handleUserScroll, { passive: true });
    el.addEventListener("touchmove", handleUserScroll, { passive: true });
    el.addEventListener("keydown", handleUserScroll);
    el.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("wheel", handleUserScroll);
      el.removeEventListener("touchmove", handleUserScroll);
      el.removeEventListener("keydown", handleUserScroll);
      el.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
    // The listener must attach when the transcript first gets content: the
    // container does not exist while the empty state is rendered.
  }, [checkNearBottom, ...deps]);

  useEffect(() => {
    if (!stickRef.current) return;
    // Follow instantly. A smooth follow emits scroll events while the animation
    // is still short of the bottom; the handler below would read that as "the
    // user scrolled away" and stop following mid-stream. Smooth remains for the
    // explicit scroll-to-latest control, where a human initiated the motion.
    endRef.current?.scrollIntoView({ behavior: "auto" });
  }, [...deps]);

  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current !== null) window.clearTimeout(programmaticTimerRef.current);
    };
  }, []);

  return { containerRef, endRef, scrollToEnd, isNearBottom };
}
