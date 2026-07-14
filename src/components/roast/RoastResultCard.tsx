import type { RoastResult } from "@/lib/domain/roast";

type Observation = RoastResult["observations"][number];

export default function RoastResultCard({ observation, number }: { observation: Observation; number: number }) {
  return (
    <article className="result-ticket">
      <span className="result-ticket-number numeric" aria-hidden="true">{String(number).padStart(2, "0")}</span>
      <div>
        <span className="result-tag">{observation.tag}</span>
        <h2>{observation.title}</h2>
        <p>{observation.body}</p>
      </div>
    </article>
  );
}
