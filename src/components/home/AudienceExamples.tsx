"use client";

import { useState } from "react";

const examples = [
  { category: "穿搭", channel: "CH 01", copy: "你的穿搭透露出一种明确的态度：衣柜里的每件衣服都有自己的梦想，但没有一件愿意配合团队。" },
  { category: "朋友圈", channel: "CH 02", copy: "你的朋友圈文案平均每句话有2.3个Emoji，建议尽快申请《公共表情符号使用许可证》。" },
  { category: "自拍", channel: "CH 03", copy: "这个自拍表情非常微妙。既想表现得毫不在意，又怕大家真的没注意。" },
  { category: "职场", channel: "CH 04", copy: "你在群里回复‘收到’的速度，像一个情绪稳定、内心已经离职三遍的人。" },
];

const reactions = ["笑声 +1", "扎心了", "本人已离场", "申请重赛"];

function ReactionButton({ label }: { label: string }) {
  const [pressed, setPressed] = useState(false);
  return <button type="button" style={{ minHeight: 44 }} aria-pressed={pressed} onClick={() => setPressed((value) => !value)}>{label}</button>;
}

export default function AudienceExamples() {
  return (
    <section id="audience" className="home-section audience-section segmented-entrance entrance-delay-1" aria-labelledby="audience-title" tabIndex={-1}>
      <div className="section-heading">
        <div><p className="eyebrow">LIVE FEED · 观众来信</p><h2 id="audience-title">今日观众席</h2></div>
        <p>我们只吐槽你主动递上来的细节，绝不拿身份和伤疤当包袱。</p>
      </div>
      <div className="audience-grid">
        {examples.map((example) => (
          <article className="audience-card" key={example.category} aria-label={`${example.category}吐槽`}>
            <header><span className="category-tag">{example.category}</span><span className="numeric">{example.channel}</span></header>
            <p>{example.copy}</p>
            <div className="reaction-row" aria-label={`${example.category}观众反应`}>
              {reactions.map((reaction) => <ReactionButton key={reaction} label={reaction} />)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
