"use client";

import { useEffect, useState } from "react";

const REVEAL_INTERVAL_MS = 700;

export function useSequentialReveal(active: boolean, total: number) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active || total < 1) {
      return;
    }

    let cancelled = false;
    const reducedMotion = typeof matchMedia === "function"
      && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      queueMicrotask(() => {
        if (!cancelled) setVisibleCount((current) => Math.max(current, total));
      });
      return () => { cancelled = true; };
    }

    queueMicrotask(() => {
      if (!cancelled) setVisibleCount((current) => Math.max(current, 1));
    });
    const timers = Array.from({ length: total - 1 }, (_, index) =>
      window.setTimeout(
        () => setVisibleCount((current) => Math.max(current, index + 2)),
        REVEAL_INTERVAL_MS * (index + 1),
      ),
    );
    const revealAfterBackground = () => {
      if (document.visibilityState === "visible") {
        setVisibleCount((current) => Math.max(current, total));
      }
    };
    document.addEventListener("visibilitychange", revealAfterBackground);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("visibilitychange", revealAfterBackground);
    };
  }, [active, total]);

  return visibleCount;
}
