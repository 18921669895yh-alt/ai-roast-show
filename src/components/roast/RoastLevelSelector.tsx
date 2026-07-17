"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isolateBackground } from "../layout/SafetyNotice";

export type RoastLevel = "gentle" | "familiar" | "stage" | "extreme";

type RoastLevelSelectorProps = {
  value: RoastLevel;
  onChange: (value: RoastLevel) => void;
};

const levels: Array<{ value: RoastLevel; score: string }> = [
  { value: "gentle", score: "30" },
  { value: "familiar", score: "65" },
  { value: "stage", score: "90" },
  { value: "extreme", score: "100" },
];

const toxicLevelCopy: Record<RoastLevel, { title: string; description: string }> = {
  gentle: { title: "轻轻带过", description: "点到为止，像熟人递来一记小小的白眼。" },
  familiar: { title: "熟人拆台", description: "中辣开麦，专拆朋友圈里的小心机。" },
  stage: { title: "爆辣锐评", description: "火力全开，把普通日常拆成大型人设事故。" },
  extreme: { title: "极其恶毒", description: "虚构喜剧专用，确认后才会放大火力。" },
};

export default function RoastLevelSelector({ value, onChange }: RoastLevelSelectorProps) {
  const [confirmStage, setConfirmStage] = useState(false);
  const confirmBackdrop = useRef<HTMLDivElement>(null);
  const confirmDialog = useRef<HTMLElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const stageRadio = useRef<HTMLInputElement>(null);

  const restoreStageFocus = useCallback(() => {
    requestAnimationFrame(() => stageRadio.current?.focus());
  }, []);

  const closeConfirmation = useCallback(() => {
    setConfirmStage(false);
    restoreStageFocus();
  }, [restoreStageFocus]);

  const confirmStageLevel = () => {
    setConfirmStage(false);
    onChange("stage");
    restoreStageFocus();
  };

  useEffect(() => {
    if (!confirmStage || !confirmBackdrop.current) return;
    const previousOverflow = document.body.style.overflow;
    const restoreBackground = isolateBackground(confirmBackdrop.current);
    document.body.style.overflow = "hidden";
    cancelButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeConfirmation();
        return;
      }
      if (event.key !== "Tab") return;
      const first = cancelButton.current;
      const last = confirmButton.current;
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const keepFocusInside = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && !confirmDialog.current?.contains(target)) {
        cancelButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", keepFocusInside);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
    };
  }, [closeConfirmation, confirmStage]);

  return (
    <>
      <fieldset className="roast-level-selector">
        <legend className="sr-only">选择吐槽浓度</legend>
        {levels.map((level) => (
          <label className={`level-card${value === level.value ? " is-selected" : ""}`} key={level.value}>
            <input
              ref={level.value === "stage" ? stageRadio : undefined}
              type="radio"
              name="roast-level"
              value={level.value}
              checked={value === level.value}
              onChange={() => level.value === "stage" ? setConfirmStage(true) : level.value === "extreme" ? (window.confirm("极其恶毒档位只用于虚构喜剧吐槽。确认启用吗？") && onChange(level.value)) : onChange(level.value)}
            />
            <span className="level-score numeric" aria-hidden="true">{level.score}</span>
            <span className="level-card-copy"><strong>{toxicLevelCopy[level.value].title}</strong><small>{toxicLevelCopy[level.value].description}</small></span>
            <span className="level-indicator" aria-hidden="true" />
          </label>
        ))}
      </fieldset>
      {confirmStage ? (
        <div ref={confirmBackdrop} className="dialog-backdrop" role="presentation">
          <section ref={confirmDialog} className="level-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="level-confirm-title">
            <span className="eyebrow">浓度警告 · 90%</span>
            <h2 id="level-confirm-title">确认开启爆辣锐评</h2>
            <p>确认开启？你的嘴硬技能可能会自动激活。</p>
            <div className="dialog-actions">
              <button ref={cancelButton} className="button-secondary" type="button" onClick={closeConfirmation}>取消</button>
              <button ref={confirmButton} className="button-primary" type="button" onClick={confirmStageLevel}>确认开启</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
