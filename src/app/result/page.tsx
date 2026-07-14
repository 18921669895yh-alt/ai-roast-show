"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AudienceReactionBar from "@/components/roast/AudienceReactionBar";
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
        <p className="eyebrow">CH 03 · 录像回放</p>
        <h1>还没有本场录像</h1>
        <p>舞台灯已经亮了，就差一位愿意把素材交出来的勇士。</p>
        <Link className="button-primary" href="/roast">先上台挨两句</Link>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="result-page">
      <header className="result-stage-heading">
        <div className="result-channel"><span className="live-badge">LIVE</span><span>CH 03 · 吐槽结果放送中</span></div>
        <p className="eyebrow">TONIGHT&apos;S ROAST · STAGE RECORDING</p>
        <h1>今晚的观察，句句有现场。</h1>
      </header>

      {visibleCount >= 1 ? (
        <section className="host-opening" aria-labelledby="host-opening-title">
          <span className="host-opening-mic" aria-hidden="true">🎤</span>
          <div><p className="eyebrow">主持人开场</p><h2 id="host-opening-title">灯光就位，先来一句</h2><blockquote>{result.opening}</blockquote></div>
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
          <p className="eyebrow">最后认真一句</p>
          <h2>笑完了，给你找补回来</h2>
          <p>{result.reverseCompliment}</p>
        </section>
      ) : null}

      {visibleCount >= totalActs ? (
        <>
          <AudienceReactionBar battleSeed={result.bestJoke} />
          <nav className="result-actions" aria-label="结果下一步">
            <Link className="button-primary" href="/report">领取吐槽报告</Link>
            <Link className="button-secondary" href="/roast">再吐槽一次</Link>
          </nav>
          <p className="fictional-disclaimer">现场掌声与舞台热度均为娱乐性虚构数据，不代表真实评价。</p>
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
