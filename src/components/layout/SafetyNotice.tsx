"use client";

import { useCallback, useEffect, useRef } from "react";

type SafetyNoticeProps = {
  open: boolean;
  onClose: () => void;
};

type IsolatedElement = {
  element: HTMLElement;
  ariaHidden: string | null;
  hadInertAttribute: boolean;
  inert: boolean;
};

export const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function isolateBackground(backdrop: HTMLElement): () => void {
  const isolated: IsolatedElement[] = [];
  let branch: HTMLElement = backdrop;

  while (branch.parentElement) {
    const parent = branch.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === branch || !(sibling instanceof HTMLElement)) continue;
      isolated.push({
        element: sibling,
        ariaHidden: sibling.getAttribute("aria-hidden"),
        hadInertAttribute: sibling.hasAttribute("inert"),
        inert: sibling.inert,
      });
      sibling.setAttribute("aria-hidden", "true");
      sibling.setAttribute("inert", "");
      sibling.inert = true;
    }
    if (parent === document.body) break;
    branch = parent;
  }

  return () => {
    for (const item of isolated) {
      if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden");
      else item.element.setAttribute("aria-hidden", item.ariaHidden);
      item.element.inert = item.inert;
      if (!item.hadInertAttribute) item.element.removeAttribute("inert");
    }
  };
}

export default function SafetyNotice({ open, onClose }: SafetyNoticeProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    if (!open || !backdropRef.current) return;

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const restoreBackground = isolateBackground(backdropRef.current);
    document.body.style.overflow = "hidden";

    const focusFirst = () => closeButtonRef.current?.focus();
    const handleFocusIn = (event: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        focusFirst();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
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

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    focusFirst();

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
      openerRef.current?.focus();
      openerRef.current = null;
    };
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="dialog-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && requestClose()}
    >
      <div
        ref={dialogRef}
        className="safety-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="safety-notice-title"
      >
        <button
          ref={closeButtonRef}
          className="dialog-close"
          type="button"
          aria-label="关闭内容原则"
          onClick={requestClose}
        >
          ×
        </button>
        <span className="eyebrow">内容原则 · CONTENT ONLY</span>
        <h2 id="safety-notice-title">只拆内容，不定人设</h2>
        <div className="safety-copy">
          <section>
            <h3>素材仅用于这一次锐评</h3>
            <p>服务器不会存储你提交的照片。照片只在你点击生成后临时用于本次请求，不写入磁盘、数据库、日志或浏览器本地记录。</p>
          </section>
          <section>
            <h3>锐评只对内容开火</h3>
            <p>我们只拆你主动提交的朋友圈文案、配图和表达方式；不评价任何人的长相、身体、身份、家庭、疾病或现实处境。</p>
          </section>
          <section>
            <h3>真实痛苦，不拿来开火</h3>
            <p>遇到丧亲、疾病、灾难或心理危机等内容，系统会自动收束语气。所有标签与浓度均为喜剧化虚构，不是真实测量。</p>
          </section>
        </div>
        <button className="button button-primary dialog-confirm" type="button" onClick={requestClose}>
          我知道了
        </button>
      </div>
    </div>
  );
}
