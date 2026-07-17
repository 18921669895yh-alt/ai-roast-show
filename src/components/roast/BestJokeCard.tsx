import Link from "next/link";

export default function BestJokeCard({ joke }: { joke: string }) {
  return (
    <section className="best-joke-card" aria-labelledby="best-joke-title">
      <div className="best-joke-heading">
        <span className="best-joke-mic" aria-hidden="true">🎙</span>
        <div>
          <p className="eyebrow">FINAL STRIKE</p>
          <h2 id="best-joke-title">这条内容最该挨的一句</h2>
        </div>
      </div>
      <blockquote>{joke}</blockquote>
      <div className="applause-wave" aria-hidden="true">
        {Array.from({ length: 13 }, (_, index) => <i key={index} />)}
      </div>
      <p className="fictional-applause">虚构锐评值：这句话值得单独截图</p>
      <Link className="button-primary" href="/report?share=1">生成分享卡</Link>
    </section>
  );
}
