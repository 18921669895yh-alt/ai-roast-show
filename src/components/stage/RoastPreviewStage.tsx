import { useState } from "react";
import type { RoastResult } from "@/lib/domain/roast";

interface RoastPreviewStageProps {
  result: RoastResult;
  onViewFull: () => void;
}

export default function RoastPreviewStage({ result, onViewFull }: RoastPreviewStageProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={`stage-result-preview${expanded ? " is-expanded" : ""}`} aria-labelledby="stage-preview-title" aria-live="polite">
      <div className="stage-preview-header">
        <span className="live-badge">AI · ON AIR</span>
        <p className="eyebrow">刚出炉的内容锐评</p>
        <h2 id="stage-preview-title">锐评先看这几句</h2>
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
      <button className="button-secondary stage-preview-expand" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        {expanded ? "收起观察细节" : `展开全部观察（${result.observations.length} 条）`}
      </button>

      <aside className="stage-preview-best">
        <span>这条内容最该挨的一句</span>
        <strong>{result.bestJoke}</strong>
      </aside>

      <button className="button-primary" type="button" onClick={onViewFull}>查看完整锐评</button>
      <p className="stage-preview-note">完整页会生成三段式锐评、反向夸奖和可分享的内容档案。</p>
    </section>
  );
}
