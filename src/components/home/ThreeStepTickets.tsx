const steps = [
  { number: "01", title: "交出那条朋友圈", copy: "上传别人发的照片、朋友圈文案、聊天截图或自我介绍。" },
  { number: "02", title: "选择锐评火力", copy: "从轻轻带过到爆辣开喷，决定这条朋友圈要被拆到几层。" },
  { number: "03", title: "领取三段式锐评", copy: "一句话绝杀、阴阳怪气、火力全开，一次看完。" },
];

export default function ThreeStepTickets() {
  return (
    <section id="steps" className="home-section ticket-section segmented-entrance entrance-delay-2" aria-labelledby="steps-title" tabIndex={-1}>
      <div className="section-heading"><div><p className="eyebrow">ADMIT ONE · 锐评流程</p><h2 id="steps-title">三步拆穿一条朋友圈</h2></div></div>
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
