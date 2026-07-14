import Link from "next/link";

export default function BestJokeCard({ joke }: { joke: string }) {
  return (
    <section className="best-joke-card" aria-labelledby="best-joke-title">
      <div className="best-joke-heading">
        <span className="best-joke-mic" aria-hidden="true">🎙</span>
        <div>
          <p className="eyebrow">PEAK MOMENT</p>
          <h2 id="best-joke-title">今晚最好笑的一句</h2>
        </div>
      </div>
      <blockquote>{joke}</blockquote>
      <div className="applause-wave" aria-hidden="true">
        {Array.from({ length: 13 }, (_, index) => <i key={index} />)}
      </div>
      <p className="fictional-applause">虚构掌声值：全场起立，隔壁桌也笑了</p>
      <Link className="button-primary" href="/report?share=1">保存为分享卡片</Link>
    </section>
  );
}
