"use client";

import { useEffect, useState } from "react";

export type LoadingPhase = "preparing" | "analyzing" | "writing";

export const LOADING_MESSAGES = [
  "正在寻找最有喜剧价值的细节……",
  "正在组织一个不伤人的包袱……",
  "正在评估你的嘴硬程度……",
  "正在向观众席申请笑声……",
  "正在删除三个过于冒犯的笑话……",
  "正在努力让你笑着破防……",
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
      <h2 id="loading-title">主持人正在备稿</h2>
      <div className="loading-wave" aria-hidden="true">▂ ▅ ▃ ▇ ▄ ▆ ▂</div>
      <p className="loading-phase">{phase === "preparing" ? "图片准备中 · 正在压缩以减少等待" : phase === "analyzing" ? "图片已上传 · Kimi 正在识别画面" : "识别完成 · 正在生成吐槽文字"}</p>
      <p role="status" aria-live="polite" aria-atomic="true">{LOADING_MESSAGES[index]}</p>
      <button className="button-secondary" type="button" onClick={onCancel}>取消生成</button>
    </section>
  );
}
