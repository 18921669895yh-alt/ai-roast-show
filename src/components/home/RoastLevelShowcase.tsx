"use client";

import { useState } from "react";
import RoastLevelSelector, { type RoastLevel } from "../roast/RoastLevelSelector";

export default function RoastLevelShowcase() {
  const [level, setLevel] = useState<RoastLevel>("familiar");
  return (
    <section className="home-section level-section segmented-entrance entrance-delay-3" aria-labelledby="level-title">
      <div className="section-heading">
        <div><p className="eyebrow">TOXIC LEVEL · 锐评火力</p><h2 id="level-title">这条朋友圈，准备被拆到几层？</h2></div>
        <p>火力只影响表达力度，不攻击敏感身份，也不把普通人上升成定性结论。</p>
      </div>
      <RoastLevelSelector value={level} onChange={setLevel} />
    </section>
  );
}
