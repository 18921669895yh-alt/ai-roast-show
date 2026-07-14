"use client";

import { useEffect } from "react";

export default function HashFocusManager() {
  useEffect(() => {
    const focusCurrentHash = () => {
      const id = window.location.hash.slice(1);
      if (id !== "about" && id !== "privacy") return;
      requestAnimationFrame(() => document.getElementById(id)?.focus({ preventScroll: true }));
    };
    focusCurrentHash();
    window.addEventListener("hashchange", focusCurrentHash);
    return () => window.removeEventListener("hashchange", focusCurrentHash);
  }, []);
  return null;
}
