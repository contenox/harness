import {
  type DependencyList,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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
      stickRef.current = near;
    };
    const handleUserScroll = () => {
      programmaticRef.current = false;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("wheel", handleUserScroll, { passive: true });
    el.addEventListener("touchmove", handleUserScroll, { passive: true });
    el.addEventListener("keydown", handleUserScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("wheel", handleUserScroll);
      el.removeEventListener("touchmove", handleUserScroll);
      el.removeEventListener("keydown", handleUserScroll);
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
