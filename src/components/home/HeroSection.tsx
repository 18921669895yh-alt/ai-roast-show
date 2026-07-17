"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import RetroTvFrame from "../stage/RetroTvFrame";

const metrics = [
  ["观众笑声", "87分贝"],
  ["精准命中", "76%"],
  ["嘴硬概率", "94%"],
];

export default function HeroSection() {
  const focusAudience = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const audience = document.getElementById("audience");
    if (typeof audience?.scrollIntoView === "function") {
      audience.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    audience?.focus({ preventScroll: true });
    window.history.replaceState(null, "", "#audience");
  };

  return (
    <section className="home-hero segmented-entrance" aria-labelledby="hero-title">
      <RetroTvFrame ariaLabel="今晚主舞台" className="hero-tv">
        <div className="hero-layout">
          <div className="hero-copy">
            <p className="toxic-kicker">毒舌锐评 · 不给面子，但给你笑点</p>
            <p className="broadcast-label"><span>● LIVE</span> CH 01 · 今晚谁来挨说</p>
            <h1 id="hero-title">来都来了，让 AI 说你两句</h1>
            <p className="hero-subtitle">把别人那条装腔作势的朋友圈交上来。我们不骂人，只把文案里的用力过猛逐句拆开。</p>
            <div className="hero-actions">
              <Link className="button-primary" href="/roast">上传照片，开始吐槽</Link>
              <a className="button-secondary" href="#audience" onClick={focusAudience}>先看看别人怎么被吐槽</a>
            </div>
            <p className="privacy-inline">不登录 · 不公开 · 照片仅用于本次生成</p>
          </div>
          <article className="sample-roast" aria-label="示例吐槽">
            <div className="sample-roast-topline"><span>本场片段</span><span className="numeric">00:14</span></div>
            <blockquote>这位朋友的穿搭很像AI生成的——每个单品都没错，组合在一起就是错了。</blockquote>
            <div className="sample-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <dl className="hero-metrics">
              {metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="numeric">{value}</dd></div>)}
            </dl>
          </article>
        </div>
      </RetroTvFrame>
    </section>
  );
}
