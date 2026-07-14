import type { MouseEvent } from "react";

const homeHashPattern = /^\/#(about|privacy)$/;

export function focusHashTarget(event: MouseEvent<HTMLAnchorElement>, href: string): boolean {
  const match = homeHashPattern.exec(href);
  if (!match) return false;
  const target = document.getElementById(match[1]);
  if (!target) return false;

  event.preventDefault();
  window.history.replaceState(null, "", href);
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  target.focus({ preventScroll: true });
  return true;
}
