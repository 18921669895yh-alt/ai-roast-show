"use client";

import { useState } from "react";
import { EASTER_EGG_MESSAGES } from "@/lib/domain/easter-eggs";
import { ROAST_TEXT_LIMITS } from "@/lib/domain/roast";

type Props = {
  value: string;
  onChange: (value: string) => void;
  submitted?: boolean;
};

export default function TextMaterialInput({ value, onChange, submitted = false }: Props) {
  const [blurred, setBlurred] = useState(false);
  const sparse = value.trim().length > 0 && value.trim().length < 12 && (blurred || submitted);
  const maxLength = ROAST_TEXT_LIMITS.request;
  return (
    <section className="text-material">
      <label htmlFor="roast-material">文字素材</label>
      <textarea
        id="roast-material"
        value={value}
        maxLength={maxLength}
        rows={8}
        placeholder="例如：他发了一条朋友圈，文案像在给普通午饭写获奖感言……"
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        onBlur={() => setBlurred(true)}
        aria-describedby={`material-count${sparse ? " material-sparse" : ""}`}
      />
      <div className="field-meta">
        <span id="material-sparse" className="field-hint" role={sparse ? "status" : undefined}>
          {sparse ? EASTER_EGG_MESSAGES.sparseInput : "细节越具体，锐评越能精准拆穿那条内容。"}
        </span>
        <span id="material-count" className="numeric">{Math.min(value.length, maxLength)} / {maxLength}</span>
      </div>
    </section>
  );
}
