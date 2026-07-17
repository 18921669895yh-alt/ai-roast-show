"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { focusHashTarget } from "./hashNavigation";

const navigation = [
  { label: "首页", href: "/" },
  { label: "开始锐评", href: "/roast" },
  { label: "锐评档案", href: "/report" },
  { label: "关于锐评", href: "/#about" },
];

type HeaderViewProps = {
  currentPath: string;
};

export function HeaderView({ currentPath }: HeaderViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

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

  const handleNavigationClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const focusedTarget = focusHashTarget(event, href);
    if (menuOpen) closeMenu(!focusedTarget);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-lockup">
          <Link className="show-logo" href="/" aria-label="AI吐槽大会">
            <span aria-hidden="true" className="logo-spark">✦</span>
            AI吐槽大会
          </Link>
          <span className="show-tagline">专拆朋友圈里的用力过猛</span>
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
            {navigation.map((item) => {
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
            交出朋友圈
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function Header() {
  return <HeaderView currentPath={usePathname()} />;
}
