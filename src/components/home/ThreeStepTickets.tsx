const steps = [
  { number: "01", title: "上传照片或文字素材", copy: "交出一张照片，或贴出朋友圈、聊天记录和自我介绍。" },
  { number: "02", title: "选择吐槽浓度", copy: "从轻轻调侃到舞台爆梗，你决定今晚的火候。" },
  { number: "03", title: "领取你的吐槽报告", copy: "AI抓住细节，生成一份有观察、有分寸的专属报告。" },
];

export default function ThreeStepTickets() {
  return (
    <section className="home-section ticket-section segmented-entrance entrance-delay-2" aria-labelledby="steps-title">
      <div className="section-heading"><div><p className="eyebrow">ADMIT ONE · 入场指南</p><h2 id="steps-title">三步登台</h2></div></div>
      <ol className="ticket-list">
        {steps.map((step) => (
          <li className="ticket" key={step.number}>
            <span className="ticket-number numeric">{step.number}</span>
            <div><h3>{step.title}</h3><p>{step.copy}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
