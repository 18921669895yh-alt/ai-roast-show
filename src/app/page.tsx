import Link from "next/link";

import HashFocusManager from "../components/home/HashFocusManager";
import HeroSection from "../components/home/HeroSection";
import RoastLevelShowcase from "../components/home/RoastLevelShowcase";
import ThreeStepTickets from "../components/home/ThreeStepTickets";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="home-page">
      <HashFocusManager />
      <HeroSection />
      <ThreeStepTickets />
      <RoastLevelShowcase />
      <section id="about" tabIndex={-1} className="home-section about-section segmented-entrance" aria-labelledby="about-title">
        <p className="eyebrow">ABOUT THE REVIEW · 锐评原则</p>
        <h2 id="about-title">只拆内容，不定人设</h2>
        <p>把别人发出的内容交上来。我们只拆文案、画面和表达里的用力过猛，不拿身份、外貌和现实处境开玩笑。</p>
      </section>
      <section className="bottom-cta segmented-entrance" aria-labelledby="bottom-cta-title">
        <div>
          <p className="eyebrow">NEXT POST · 下一条朋友圈</p>
          <h2 id="bottom-cta-title">把那条朋友圈交出来。</h2>
          <p>你负责提供内容，AI负责把文案里的小心机、滤镜和史诗感逐句拆开。</p>
          <p id="privacy" tabIndex={-1} className="privacy-reassurance">🔒 素材仅用于本次生成，不会公开展示；你随时可以退出。</p>
        </div>
        <Link className="button-primary bottom-cta-button" href="/roast">开始锐评 <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
