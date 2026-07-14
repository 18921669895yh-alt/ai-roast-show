"use client";

import { useEffect, useRef, useState } from "react";
import { EASTER_EGG_MESSAGES, shouldAnnounceInternalExit } from "@/lib/domain/easter-eggs";

export function useExitAttemptToast(active: boolean) {
  const [message, setMessage] = useState("");
  const allowed = useRef(new WeakSet<HTMLAnchorElement>());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!active || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      if (allowed.current.has(target)) {
        allowed.current.delete(target);
        return;
      }
      if (!shouldAnnounceInternalExit({ active, currentUrl: window.location.href, targetUrl: target.href })) return;
      event.preventDefault();
      event.stopPropagation();
      setMessage(EASTER_EGG_MESSAGES.exitAttempt);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        allowed.current.add(target);
        target.click();
      }, 450);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [active]);

  return { exitMessage: message, exitClarification: EASTER_EGG_MESSAGES.exitClarification, dismissExitMessage: () => setMessage("") };
}
