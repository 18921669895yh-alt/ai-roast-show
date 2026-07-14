"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isolateBackground } from "../layout/SafetyNotice";

export type RoastLevel = "gentle" | "familiar" | "stage";

type RoastLevelSelectorProps = {
  value: RoastLevel;
  onChange: (value: RoastLevel) => void;
};

const levels: Array<{ value: RoastLevel; title: string; score: string; description: string }> = [
  { value: "gentle", title: "轻轻调侃", score: "30", description: "适合第一次上台，保证还能笑着回家。" },
  { value: "familiar", title: "熟人互损", score: "65", description: "像认识你五年的朋友，说话开始不留情面。" },
  { value: "stage", title: "舞台爆梗", score: "90", description: "包袱全开，但仍然不进行恶意攻击。" },
];

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
              onChange={() => level.value === "stage" ? setConfirmStage(true) : onChange(level.value)}
            />
            <span className="level-score numeric" aria-hidden="true">{level.score}</span>
            <span className="level-card-copy"><strong>{level.title}</strong><small>{level.description}</small></span>
            <span className="level-indicator" aria-hidden="true" />
          </label>
        ))}
      </fieldset>
      {confirmStage ? (
        <div ref={confirmBackdrop} className="dialog-backdrop" role="presentation">
          <section ref={confirmDialog} className="level-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="level-confirm-title">
            <span className="eyebrow">浓度警告 · 90%</span>
            <h2 id="level-confirm-title">确认开启舞台爆梗</h2>
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
