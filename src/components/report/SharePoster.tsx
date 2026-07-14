"use client";

import { useEffect, useRef, useState } from "react";
import { useModalDialog } from "@/components/layout/useModalDialog";
import type { RoastResult } from "@/lib/domain/roast";

type SharePosterProps = {
  open: boolean;
  result: RoastResult;
  onClose: () => void;
  onExport: (node: HTMLElement) => Promise<void>;
};

export default function SharePoster({ open, result, onClose, onExport }: SharePosterProps) {
  const { backdropRef, dialogRef, initialFocusRef, requestClose } = useModalDialog(open, onClose);
  const surfaceRef = useRef<HTMLElement>(null);
  const mounted = useRef(true);
  const exporting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  if (!open) return null;
  const denseCopy = result.observations[0].body.length > 240 || result.bestJoke.length > 120 || result.comedyTags.some((tag) => tag.length > 30);
  const exportPng = async () => {
    if (exporting.current || !surfaceRef.current) return;
    exporting.current = true;
    setBusy(true);
    setError("");
    try {
      await onExport(surfaceRef.current);
    } catch {
      if (mounted.current) setError("导出失败，请重试；你仍可复制最佳金句");
    } finally {
      exporting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const copyBestJoke = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(result.bestJoke);
      if (mounted.current) setCopyFeedback("最佳金句已复制");
    } catch {
      if (mounted.current) setCopyFeedback("复制失败，请手动选择金句复制");
    }
  };

  return (
    <div ref={backdropRef} data-testid="share-backdrop" className="share-poster-backdrop" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section ref={dialogRef} className="share-poster-dialog" role="dialog" aria-modal="true" aria-labelledby="share-poster-title">
        <header className="share-dialog-header">
          <h2 id="share-poster-title">分享卡片预览</h2>
          <button ref={initialFocusRef} type="button" className="dialog-close" aria-label="关闭分享卡片预览" onClick={requestClose}>×</button>
        </header>
        <div className="share-preview-frame">
          <article ref={surfaceRef} data-testid="share-poster-surface" className={`share-poster-surface${denseCopy ? " is-copy-dense" : ""}`}>
            <div className="poster-brand"><span>AI吐槽大会</span><small>COMEDY ARCHIVE · 2026</small></div>
            <div className="poster-feature"><span>本场素材观察</span><p>{result.observations[0].body}</p></div>
            <ul className="poster-tags">{result.comedyTags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
            <blockquote>{result.bestJoke}</blockquote>
            <div className="poster-score"><span>嘴硬指数</span><strong>{result.metrics.stubbornness}</strong><small>/ 100</small></div>
            <footer><div className="qr-placeholder" aria-label="二维码占位">QR</div><p>扫码来一场<br /><strong>ai-roast.local</strong></p></footer>
          </article>
        </div>
        {error ? <p className="share-export-error" role="alert">{error}</p> : null}
        <p className="share-copy-feedback" role="status" aria-live="polite">{copyFeedback}</p>
        <div className="share-dialog-actions">
          <button type="button" className="button-secondary" onClick={copyBestJoke}>复制最佳金句</button>
          <button type="button" className="button-primary" disabled={busy} onClick={exportPng}>{busy ? "正在导出…" : "下载 PNG"}</button>
        </div>
      </section>
    </div>
  );
}
