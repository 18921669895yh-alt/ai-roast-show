"use client";

import { useState } from "react";

import RoastLevelSelector, { type RoastLevel } from "../roast/RoastLevelSelector";

export default function RoastLevelShowcase() {
  const [level, setLevel] = useState<RoastLevel>("familiar");
  return (
    <section className="home-section level-section segmented-entrance entrance-delay-3" aria-labelledby="level-title">
      <div className="section-heading">
        <div><p className="eyebrow">MIC LEVEL · 嘴硬刻度</p><h2 id="level-title">今晚想被说到什么程度？</h2></div>
        <p>强度只影响包袱密度，不会降低内容安全边界。</p>
      </div>
      <RoastLevelSelector value={level} onChange={setLevel} />
    </section>
  );
}
