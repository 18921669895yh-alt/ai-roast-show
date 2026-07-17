"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { focusHashTarget } from "./hashNavigation";
import { focusableSelector, isolateBackground } from "./SafetyNotice";
import { EASTER_EGG_COPY } from "@/lib/domain/easter-eggs";

const navigation = [
  { label: "首页", href: "/" },
  { label: "开始吐槽", href: "/roast" },
  { label: "吐槽报告", href: "/report" },
  { label: "即兴对决", href: "/battle" },
  { label: "关于节目", href: "/#about" },
];

type HeaderViewProps = {
  currentPath: string;
  onLogoFiveClicks?: () => void;
  onHomeNavigate?: (href: string) => void;
};

export function HeaderView({ currentPath, onLogoFiveClicks, onHomeNavigate }: HeaderViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selfRoastOpen, setSelfRoastOpen] = useState(false);
  const logoClicks = useRef(0);
  const logoLink = useRef<HTMLAnchorElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const selfRoastBackdrop = useRef<HTMLDivElement>(null);
  const selfRoastDialog = useRef<HTMLElement>(null);
  const selfRoastClose = useRef<HTMLButtonElement>(null);
  const selfRoastOpener = useRef<HTMLElement | null>(null);
  const logoTimer = useRef<number | null>(null);
  const allowLogoNavigation = useRef(false);

  useEffect(() => () => {
    if (logoTimer.current !== null) window.clearTimeout(logoTimer.current);
  }, []);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButton.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeMenu, menuOpen]);

  const closeSelfRoast = useCallback(() => {
    setSelfRoastOpen(false);
  }, []);

  useEffect(() => {
    if (!selfRoastOpen || !selfRoastBackdrop.current) return;
    const previousOverflow = document.body.style.overflow;
    const restoreBackground = isolateBackground(selfRoastBackdrop.current);
    document.body.style.overflow = "hidden";
    selfRoastClose.current?.focus();
    const keepFocusInside = (event: FocusEvent) => {
      if (selfRoastDialog.current && !selfRoastDialog.current.contains(event.target as Node)) {
        selfRoastClose.current?.focus();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSelfRoast();
        return;
      }
      if (event.key !== "Tab" || !selfRoastDialog.current) return;
      const focusable = Array.from(selfRoastDialog.current.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("focusin", keepFocusInside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("focusin", keepFocusInside);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
      selfRoastOpener.current?.focus();
      selfRoastOpener.current = null;
    };
  }, [closeSelfRoast, selfRoastOpen]);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (allowLogoNavigation.current) {
      allowLogoNavigation.current = false;
      logoClicks.current = 0;
      return;
    }
    logoClicks.current += 1;
    if (logoClicks.current < 5) {
      event.preventDefault();
      if (logoTimer.current === null) {
        logoTimer.current = window.setTimeout(() => {
          logoTimer.current = null;
          logoClicks.current = 0;
          if (currentPath !== "/") {
            if (onHomeNavigate) onHomeNavigate("/");
            else {
              allowLogoNavigation.current = true;
              logoLink.current?.click();
            }
          }
        }, 1_000);
      }
      return;
    }
    event.preventDefault();
    if (logoTimer.current !== null) window.clearTimeout(logoTimer.current);
    logoTimer.current = null;
    logoClicks.current = 0;
    if (onLogoFiveClicks) onLogoFiveClicks();
    else {
      selfRoastOpener.current = event.currentTarget;
      setSelfRoastOpen(true);
    }
  };

  const handleNavigationClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const focusedTarget = focusHashTarget(event, href);
    if (menuOpen) closeMenu(!focusedTarget);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-lockup">
          <Link ref={logoLink} className="show-logo" href="/" aria-label="AI吐槽大会" onClick={handleLogoClick}>
            <span aria-hidden="true" className="logo-spark">✦</span>
            AI吐槽大会
          </Link>
          <span className="show-tagline">本节目可能造成轻微嘴硬</span>
        </div>
        <button
          ref={menuButton}
          className="menu-toggle"
          type="button"
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
          onClick={() => menuOpen ? closeMenu(false) : setMenuOpen(true)}
        >
          <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        </button>
        <nav
          id="primary-navigation"
          className={`primary-navigation${menuOpen ? " is-open" : ""}`}
          aria-label="主导航"
        >
          <ul>
            {navigation.filter((item) => item.href !== "/battle").map((item) => {
              const itemPath = item.href.split("#")[0] || "/";
              const isCurrent = !item.href.includes("#") && currentPath === itemPath;
              return (
                <li key={item.href + item.label}>
                  <Link href={item.href} aria-current={isCurrent ? "page" : undefined} onClick={(event) => handleNavigationClick(event, item.href)}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            className="header-cta"
            href="/roast"
            aria-current={currentPath === "/roast" ? "page" : undefined}
            onClick={(event) => handleNavigationClick(event, "/roast")}
          >
            上台挨两句
          </Link>
        </nav>
      </div>
      {selfRoastOpen ? (
        <div ref={selfRoastBackdrop} className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSelfRoast();
        }}>
          <section ref={selfRoastDialog} className="self-roast-dialog" role="dialog" aria-modal="true" aria-labelledby="self-roast-title">
            <span className="eyebrow">{EASTER_EGG_COPY.selfRoastEyebrow}</span>
            <h2 id="self-roast-title">{EASTER_EGG_COPY.selfRoastTitle}</h2>
            <p>{EASTER_EGG_COPY.selfRoastBody}</p>
            <button
              ref={selfRoastClose}
              className="dialog-close"
              type="button"
              aria-label={EASTER_EGG_COPY.selfRoastCloseLabel}
              onClick={closeSelfRoast}
            >
              ×
            </button>
          </section>
        </div>
      ) : null}
    </header>
  );
}

export default function Header() {
  return <HeaderView currentPath={usePathname()} />;
}
