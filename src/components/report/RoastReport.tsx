import AwardCard from "./AwardCard";
import ComedyMetricCard from "./ComedyMetricCard";
import type { RoastResult } from "@/lib/domain/roast";

const DISCLAIMER = "以下数据均为喜剧化虚构，不是真实心理测量。";

export default function RoastReport({ report }: { report: RoastResult }) {
  const feature = report.observations[0];
  return (
    <article className="roast-report print-feed">
      <header className="report-heading">
        <p className="eyebrow">POST REVIEW · ARCHIVE</p>
        <h1>AI吐槽大会：这条朋友圈的锐评档案</h1>
        <p>只依据本次提交的内容整理，不对发布者做人格、生活或心理判断。</p>
      </header>

      <section className="report-section" aria-labelledby="persona-title">
        <p className="report-section-number">01</p><h2 id="persona-title">内容锐评标签</h2>
        <ul className="report-tag-list">{report.comedyTags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
      </section>

      <section className="report-section feature-section" aria-labelledby="feature-title">
        <p className="report-section-number">02</p><h2 id="feature-title">最该拆的细节</h2>
        <div className="feature-grid">
          <div><span>锐评切口</span><strong>{feature.title}</strong></div>
          <div><span>内容证据</span><p>{feature.body}</p></div>
          <div><span>装感浓度</span><p>{feature.tag} · {report.metrics.atmosphere}/100 的内容表现值</p></div>
          <div><span>锐评说明</span><p>这条结论只来自本次提交的表达细节，不代表对发布者任何现实层面的判断。</p></div>
        </div>
      </section>

      <section className="report-section metrics-panel" aria-labelledby="metrics-title">
        <p className="report-section-number">03</p><h2 id="metrics-title">锐评数据面板</h2>
        <p className="metrics-disclaimer">{DISCLAIMER}</p>
        <div className="metric-grid">
          <ComedyMetricCard label="装感浓度" value={report.metrics.atmosphere} caption="内容包装的用力程度" />
          <ComedyMetricCard label="人设用力值" value={report.metrics.stubbornness} caption="表达里藏不住的执着" />
          <ComedyMetricCard label="随便可信度" value={report.metrics.casualCredibility} caption="“随便发发”这句话的可信程度" />
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
