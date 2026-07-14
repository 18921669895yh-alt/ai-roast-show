import type { ReactNode } from "react";

type RetroTvFrameProps = { children: ReactNode; ariaLabel: string; className?: string };

export default function RetroTvFrame({ children, ariaLabel, className = "" }: RetroTvFrameProps) {
  return (
    <section className={`retro-tv ${className}`.trim()} aria-label={ariaLabel}>
      <div className="retro-tv-decoration" aria-hidden="true" data-tv-decoration>
        <span className="tv-vent" />
        <span className="tv-dial tv-dial-large" />
        <span className="tv-dial tv-dial-small" />
      </div>
      <div className="retro-tv-screen">{children}</div>
    </section>
  );
}
