import type { RoastResult } from "@/lib/domain/roast";

interface RoastPreviewStageProps {
  result: RoastResult;
  onViewFull: () => void;
}

export default function RoastPreviewStage({ result, onViewFull }: RoastPreviewStageProps) {
  return (
    <section className="stage-result-preview" aria-labelledby="stage-preview-title" aria-live="polite">
      <div className="stage-preview-header">
        <span className="live-badge">AI · ON AIR</span>
        <p className="eyebrow">刚出炉的现场预览</p>
        <h2 id="stage-preview-title">右侧先听这几句</h2>
      </div>

      <blockquote className="stage-preview-opening">{result.opening}</blockquote>

      <ol className="stage-preview-observations">
        {result.observations.map((observation, index) => (
          <li key={`${observation.title}-${index}`}>
            <span className="numeric">0{index + 1}</span>
            <div>
              <h3>{observation.title}</h3>
              <p>{observation.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <aside className="stage-preview-best">
        <span>今晚最好笑的一句</span>
        <strong>{result.bestJoke}</strong>
      </aside>

      <button className="button-primary" type="button" onClick={onViewFull}>查看完整吐槽</button>
      <p className="stage-preview-note">完整页还有反向夸奖、观众反应和吐槽报告。</p>
    </section>
  );
}
