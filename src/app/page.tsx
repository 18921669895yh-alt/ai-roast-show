import Link from "next/link";

import AudienceExamples from "../components/home/AudienceExamples";
import HashFocusManager from "../components/home/HashFocusManager";
import HeroSection from "../components/home/HeroSection";
import RoastLevelShowcase from "../components/home/RoastLevelShowcase";
import ThreeStepTickets from "../components/home/ThreeStepTickets";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="home-page">
      <HashFocusManager />
      <HeroSection />
      <AudienceExamples />
      <ThreeStepTickets />
      <RoastLevelShowcase />
      <section id="about" tabIndex={-1} className="home-section about-section segmented-entrance" aria-labelledby="about-title">
        <p className="eyebrow">ABOUT THE SHOW · 节目说明</p>
        <h2 id="about-title">AI也要挨骂</h2>
        <p>这是一场有观察、有分寸的互动喜剧。我们只把你主动提供的细节变成包袱，不拿身份、外貌和伤疤开玩笑。</p>
      </section>
      <section className="bottom-cta segmented-entrance" aria-labelledby="bottom-cta-title">
        <div>
          <p className="eyebrow">NEXT UP · 轮到你了</p>
          <h2 id="bottom-cta-title">准备好了吗？</h2>
          <p>你负责提供素材，AI负责发现那些你自己一直假装没注意到的细节。</p>
          <p id="privacy" tabIndex={-1} className="privacy-reassurance">🔒 照片仅用于本次生成，不会进入公开观众席；你随时可以退出。</p>
        </div>
        <Link className="button-primary bottom-cta-button" href="/roast">好的，开始说我 <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
