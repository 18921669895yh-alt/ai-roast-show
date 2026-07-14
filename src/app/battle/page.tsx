"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ComebackBattle, { type BattleRoastContext } from "@/components/battle/ComebackBattle";
import { clearBattleSeed, loadBattleSeed } from "@/lib/domain/battle-seed";
import { loadLatestRoast } from "@/lib/domain/storage";

export default function BattlePage() {
  const [hydrated, setHydrated] = useState(false);
  const [context, setContext] = useState<BattleRoastContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const roast = loadLatestRoast();
      const seed = loadBattleSeed();
      clearBattleSeed();
      if (roast) setContext({ opening: roast.opening, bestJoke: roast.bestJoke, observations: roast.observations });
      else if (seed) setContext({ opening: seed.bestJoke, bestJoke: seed.bestJoke });
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  if (!hydrated) return <main id="main-content" tabIndex={-1} className="battle-page" aria-busy="true" />;

  if (!context) {
    return (
      <main id="main-content" tabIndex={-1} className="result-page result-empty battle-empty">
        <span className="live-badge">WAITING</span>
        <p className="eyebrow">CH 04 · 即兴对决</p>
        <h1>还没有能接上的梗</h1>
        <p>先让主持人抛一句，再带着那句回来打满五个回合。</p>
        <Link className="button-primary" href="/roast">先去吐槽一场</Link>
      </main>
    );
  }

  return <main id="main-content" tabIndex={-1} className="battle-page"><ComebackBattle roastContext={context} /></main>;
}
