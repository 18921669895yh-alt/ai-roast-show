import AwardCard from "./AwardCard";
import ComedyMetricCard from "./ComedyMetricCard";
import type { RoastResult } from "@/lib/domain/roast";

const DISCLAIMER = "以下数据均为喜剧化虚构，不是真实心理测量。";

export default function RoastReport({ report }: { report: RoastResult }) {
  const feature = report.observations[0];
  return (
    <article className="roast-report print-feed">
      <header className="report-heading">
        <p className="eyebrow">CH 05 · COMEDY ARCHIVE</p>
        <h1>AI吐槽大会：关于你的非正式喜剧观察报告</h1>
        <p>一份只依据本场现有素材整理的非正式节目单，不作性格判断或心理诊断。</p>
      </header>

      <section className="report-section" aria-labelledby="persona-title">
        <p className="report-section-number">01</p><h2 id="persona-title">喜剧人格标签</h2>
        <ul className="report-tag-list">{report.comedyTags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
      </section>

      <section className="report-section feature-section" aria-labelledby="feature-title">
        <p className="report-section-number">02</p><h2 id="feature-title">最有趣特征</h2>
        <div className="feature-grid">
          <div><span>特征名称</span><strong>{feature.title}</strong></div>
          <div><span>已有观察证据</span><p>{feature.body}</p></div>
          <div><span>喜剧价值</span><p>{feature.tag} · {report.metrics.atmosphere}/100 的现场气氛贡献</p></div>
          <div><span>AI点评</span><p>这条笑点来自本场已记录的表达细节，适合做舞台包袱，不代表任何心理结论。</p></div>
        </div>
      </section>

      <section className="report-section metrics-panel" aria-labelledby="metrics-title">
        <p className="report-section-number">03</p><h2 id="metrics-title">虚拟数据面板</h2>
        <p className="metrics-disclaimer">{DISCLAIMER}</p>
        <div className="metric-grid">
          <ComedyMetricCard label="现场气氛值" value={report.metrics.atmosphere} caption="今晚的笑声供电量" />
          <ComedyMetricCard label="嘴硬指数" value={report.metrics.stubbornness} caption="立场稳定，梗也稳定" />
          <ComedyMetricCard label="随便可信度" value={report.metrics.casualCredibility} caption="说随便时的节目效果" />
        </div>
      </section>

      <AwardCard award={report.award} />

      <section className="report-best-joke" aria-labelledby="report-joke-title">
        <p className="report-section-number">05</p><h2 id="report-joke-title">本场最佳金句</h2>
        <blockquote>{report.bestJoke}</blockquote>
      </section>
    </article>
  );
}
