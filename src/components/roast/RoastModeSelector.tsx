"use client";

import type { RoastMode } from "@/lib/domain/roast";

const MODES: Array<{ value: RoastMode; label: string }> = [
  { value: "photo", label: "锐评这张照片" },
  { value: "outfit", label: "锐评这身穿搭" },
  { value: "moments", label: "锐评这条朋友圈" },
  { value: "chat", label: "锐评这段聊天" },
  { value: "bio", label: "锐评这份自我介绍" },
  { value: "random", label: "随机开麦" },
];

export default function RoastModeSelector({ value, onChange }: { value: RoastMode; onChange: (value: RoastMode) => void }) {
  return (
    <fieldset className="roast-mode-selector">
      <legend>今晚准备锐评谁的内容</legend>
      <div className="mode-chip-list">
        {MODES.map((mode) => (
          <label className={`mode-chip${value === mode.value ? " is-selected" : ""}`} key={mode.value}>
            <input type="radio" name="roast-mode" value={mode.value} checked={value === mode.value} onChange={() => onChange(mode.value)} />
            <span>{mode.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
