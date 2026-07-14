"use client";

import { useEffect, useState } from "react";

import { normalizeScores, type BattleScores } from "@/lib/domain/battle";
import { getMotionProfile } from "@/lib/domain/easter-eggs";

const SCORE_FIELDS = [
  ["wit", "接梗能力"],
  ["force", "反击力度"],
  ["stubbornness", "嘴硬指数"],
  ["support", "观众支持率"],
] as const;

function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const reduced = typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motion = getMotionProfile(reduced);
    if (motion.duration === 0) {
      const timer = window.setTimeout(() => setShown(value), 0);
      return () => window.clearTimeout(timer);
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      setShown(Math.round(value * Math.min(1, (now - started) / motion.duration)));
      if (now - started < motion.duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <output aria-label={`${value} 分`}>{shown}</output>;
}

export default function BattleScoreboard({ scores }: { scores: BattleScores }) {
  const safe = normalizeScores(scores);
  return (
    <dl className="battle-scoreboard" aria-label="本回合评分">
      {SCORE_FIELDS.map(([field, label]) => (
        <div className="battle-score" key={field}>
          <dt>{label}</dt>
          <dd>
            <meter aria-label={label} min="0" max="100" value={safe[field]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe[field]} />
            <AnimatedNumber value={safe[field]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
