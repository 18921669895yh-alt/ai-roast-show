"use client";

import { useEffect, useState } from "react";

export type LoadingPhase = "preparing" | "analyzing" | "writing";

export const LOADING_MESSAGES = [
  "正在寻找这条朋友圈最用力的细节……",
  "正在拆开这条朋友圈的包装……",
  "正在给这条内容的装感做标记……",
  "正在把文案里的小心机圈出来……",
  "正在删除三个不够聪明的笑话……",
  "正在给这条朋友圈写下最后一刀……",
] as const;

export default function LoadingComedyStage({ onCancel, phase = "writing" }: { onCancel: () => void; phase?: LoadingPhase }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const interval = window.setInterval(() => setIndex((current) => (current + 1) % LOADING_MESSAGES.length), 1400);
    return () => window.clearInterval(interval);
  }, []);
  return (
    <section className="loading-comedy-stage" aria-labelledby="loading-title">
      <span className="live-badge">AI LIVE</span>
      <h2 id="loading-title">AI 正在拆文案</h2>
      <div className="loading-wave" aria-hidden="true">▂ ▅ ▃ ▇ ▄ ▆ ▂</div>
      <p className="loading-phase">{phase === "preparing" ? "图片准备中 · 正在压缩以减少等待" : phase === "analyzing" ? "图片已上传 · Kimi 正在识别画面" : "识别完成 · 正在生成朋友圈锐评"}</p>
      <p role="status" aria-live="polite" aria-atomic="true">{LOADING_MESSAGES[index]}</p>
      <button className="button-secondary" type="button" onClick={onCancel}>取消生成</button>
    </section>
  );
}
