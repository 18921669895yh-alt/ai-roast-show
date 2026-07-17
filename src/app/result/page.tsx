"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import BestJokeCard from "@/components/roast/BestJokeCard";
import RoastResultCard from "@/components/roast/RoastResultCard";
import { useSequentialReveal } from "@/components/roast/useSequentialReveal";
import type { RoastResult } from "@/lib/domain/roast";
import { loadLatestRoast } from "@/lib/domain/storage";
import { EASTER_EGG_MESSAGES, LONG_STARE_MS, LONG_STARE_SESSION_KEY } from "@/lib/domain/easter-eggs";

export default function ResultPage() {
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [stareMessage, setStareMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setResult(loadLatestRoast());
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!result) return;
    try { if (sessionStorage.getItem(LONG_STARE_SESSION_KEY)) return; } catch { /* best effort */ }
    let remaining = LONG_STARE_MS;
    let startedAt = 0;
    let timer: number | null = null;
    const stop = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    };
    const finish = () => {
      timer = null;
      try { sessionStorage.setItem(LONG_STARE_SESSION_KEY, "1"); } catch { /* best effort */ }
      setStareMessage(EASTER_EGG_MESSAGES.longStare);
    };
    const start = () => {
      if (timer !== null || document.visibilityState === "hidden") return;
      startedAt = Date.now();
      timer = window.setTimeout(finish, remaining);
    };
    const visibility = () => document.visibilityState === "hidden" ? stop() : start();
    document.addEventListener("visibilitychange", visibility);
    start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [result]);

  const totalActs = result ? result.observations.length + 3 : 0;
  const visibleCount = useSequentialReveal(Boolean(result), totalActs);
  const announced = result && visibleCount > 0
    ? [result.opening, ...result.observations.map(({ body }) => body), result.bestJoke, result.reverseCompliment][visibleCount - 1]
    : "";

  if (!hydrated) {
    return <main id="main-content" tabIndex={-1} className="result-page" aria-busy="true" />;
  }

  if (!result) {
    return (
      <main id="main-content" tabIndex={-1} className="result-page result-empty">
        <span className="live-badge">OFF AIR</span>
        <p className="eyebrow">NO MATERIAL · 等待素材</p>
        <h1>还没有可锐评的内容</h1>
        <p>交出一条别人发的朋友圈、配图或聊天截图，AI 才能开始拆它的表达方式。</p>
        <Link className="button-primary" href="/roast">去交出素材</Link>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="result-page">
      <header className="result-stage-heading">
        <div className="result-channel"><span className="live-badge">LIVE</span><span>POST REVIEW · 锐评已生成</span></div>
        <p className="eyebrow">MOMENTS REVIEW · CONTENT ONLY</p>
        <h1>这条朋友圈，已被逐句拆开。</h1>
      </header>

      {visibleCount >= 1 ? (
        <section className="host-opening" aria-labelledby="host-opening-title">
          <span className="host-opening-mic" aria-hidden="true">🎤</span>
          <div><p className="eyebrow">一句话绝杀</p><h2 id="host-opening-title">先给这条内容来一句</h2><blockquote>{result.opening}</blockquote></div>
        </section>
      ) : null}

      <div className="result-observations">
        {result.observations.slice(0, Math.max(0, visibleCount - 1)).map((observation, index) => (
          <RoastResultCard key={`${observation.title}-${index}`} observation={observation} number={index + 1} />
        ))}
      </div>

      {visibleCount >= result.observations.length + 2 ? <BestJokeCard joke={result.bestJoke} /> : null}
      {visibleCount >= result.observations.length + 3 ? (
        <section className="reverse-compliment">
          <p className="eyebrow">反向夸奖</p>
          <h2>收尾再补一刀</h2>
          <p>{result.reverseCompliment}</p>
        </section>
      ) : null}

      {visibleCount >= totalActs ? (
        <>
          <nav className="result-actions" aria-label="结果下一步">
            <Link className="button-primary" href="/report?share=1">生成分享卡</Link>
            <Link className="button-secondary" href="/report">查看锐评档案</Link>
            <Link className="button-secondary" href="/roast">再锐评一条</Link>
          </nav>
          <p className="fictional-disclaimer">标签与分数均为娱乐性虚构数据，只评价这条提交内容，不代表对任何人的真实评价。</p>
        </>
      ) : null}

      <span className="sr-only" role="status" aria-label="现场播报" aria-live="polite" aria-atomic="true">{announced}</span>
      {stareMessage ? (
        <aside className="easter-toast" role="status" aria-label="停留彩蛋">
          <span>{stareMessage}</span>
          <button type="button" aria-label="关闭停留提示" onClick={() => setStareMessage("")}>×</button>
        </aside>
      ) : null}
    </main>
  );
}
