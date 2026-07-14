import type { RoastResult } from "@/lib/domain/roast";

export default function AwardCard({ award }: { award: RoastResult["award"] }) {
  return (
    <section className="report-award" aria-labelledby="report-award-title">
      <span className="award-trophy" aria-hidden="true">🏆</span>
      <div>
        <p className="eyebrow">TONIGHT&apos;S TROPHY</p>
        <h2 id="report-award-title">年度喜剧奖项</h2>
        <h3>{award.title}</h3>
        <p>{award.citation}</p>
      </div>
    </section>
  );
}
