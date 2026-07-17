"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import RoastReport from "@/components/report/RoastReport";
import SharePoster from "@/components/report/SharePoster";
import type { ReportResult } from "@/lib/ai/provider";
import { postJson } from "@/lib/api/client";
import type { RoastResult } from "@/lib/domain/roast";
import { loadLatestRoast } from "@/lib/domain/storage";
import { exportSharePoster } from "@/lib/export/share-poster";

function mergeReport(seed: RoastResult, refined: ReportResult): RoastResult {
  return { ...seed, comedyTags: refined.comedyTags, metrics: refined.metrics, award: refined.award, bestJoke: refined.bestJoke };
}

export default function ReportPage() {
  const [hydrated, setHydrated] = useState(false);
  const [seed, setSeed] = useState<RoastResult | null>(null);
  const [report, setReport] = useState<RoastResult | null>(null);
  const [notice, setNotice] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const started = useRef(false);
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const autoOpened = useRef(false);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    queueMicrotask(async () => {
      if (cancelled || started.current) return;
      started.current = true;
      const latest = loadLatestRoast();
      if (!alive.current) return;
      setSeed(latest);
      setReport(latest);
      setHydrated(true);
      if (!latest) return;
      if (!autoOpened.current && new URLSearchParams(window.location.search).get("share") === "1") {
        autoOpened.current = true;
        setShareOpen(true);
      }
      const abortController = new AbortController();
      controller.current = abortController;
      try {
        const response = await postJson<ReportResult>("/api/report", { roast: latest }, { signal: abortController.signal });
        if (!alive.current || abortController.signal.aborted) return;
        setReport(mergeReport(latest, response.data));
        if (response.meta.degraded) setNotice("锐评档案精修暂时离线，当前展示本地内容档案。");
      } catch (error) {
        if (!alive.current || abortController.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        setNotice("锐评档案精修暂时离线，当前展示本地内容档案。");
      }
    });
    return () => {
      cancelled = true;
      alive.current = false;
      controller.current?.abort();
    };
  }, []);

  const copyJoke = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.bestJoke);
      if (alive.current) setNotice("最佳金句已复制");
    } catch {
      if (alive.current) setNotice("复制失败，请手动选择金句复制");
    }
  };

  if (!hydrated) return <main id="main-content" tabIndex={-1} className="report-page" aria-busy="true" />;
  if (!report || !seed) return (
    <main id="main-content" tabIndex={-1} className="report-page result-empty">
      <span className="live-badge">NO RECORD</span>
        <p className="eyebrow">POST ARCHIVE · 等待内容</p>
        <h1>还没有可打印的锐评档案</h1>
        <p>先锐评一条别人发的内容，才能把这份档案整理出来。</p>
        <Link className="button-primary" href="/roast">去交出素材</Link>
    </main>
  );

  return (
    <main id="main-content" tabIndex={-1} className="report-page">
      <RoastReport report={report} />
      <nav className="report-actions" aria-label="报告操作">
        <button className="button-primary" type="button" onClick={() => setShareOpen(true)}>生成分享卡</button>
        <button className="button-secondary" type="button" onClick={copyJoke}>复制最佳金句</button>
        <Link className="button-secondary" href="/roast">再锐评一条</Link>
      </nav>
      <p className="report-feedback" role="status" aria-live="polite">{notice}</p>
      <SharePoster open={shareOpen} result={report} onClose={() => setShareOpen(false)} onExport={exportSharePoster} />
    </main>
  );
}
