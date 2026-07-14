"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveBattleSeed } from "@/lib/domain/battle-seed";
import { EASTER_EGG_MESSAGES } from "@/lib/domain/easter-eggs";

const reactions = ["哈哈哈", "有点准", "太损了"] as const;
type Reaction = (typeof reactions)[number];

export default function AudienceReactionBar({ battleSeed, onNavigate }: { battleSeed?: string; onNavigate?: (href: string) => void }) {
  const [counts, setCounts] = useState<Record<Reaction | "不服", number>>({ 哈哈哈: 0, 有点准: 0, 太损了: 0, 不服: 0 });
  const [floatKey, setFloatKey] = useState(0);
  const [message, setMessage] = useState("");
  const [protesting, setProtesting] = useState(false);
  const laughTimer = useRef<number | null>(null);
  const messageTimer = useRef<number | null>(null);
  const protestTimer = useRef<number | null>(null);
  const promptTimer = useRef<number | null>(null);
  const navigationTimer = useRef<number | null>(null);
  const protestArmed = useRef(false);
  const navigating = useRef(false);
  const allowNavigation = useRef(false);

  useEffect(() => {
    return () => {
      if (laughTimer.current !== null) window.clearTimeout(laughTimer.current);
      if (messageTimer.current !== null) window.clearTimeout(messageTimer.current);
      if (protestTimer.current !== null) window.clearTimeout(protestTimer.current);
      if (promptTimer.current !== null) window.clearTimeout(promptTimer.current);
      if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
    };
  }, []);

  const react = (reaction: Reaction) => {
    protestArmed.current = false;
    if (promptTimer.current !== null) window.clearTimeout(promptTimer.current);
    setCounts((current) => ({ ...current, [reaction]: current[reaction] + 1 }));
    if (reaction === "哈哈哈") {
      setFloatKey((current) => current + 1);
      if (laughTimer.current !== null) window.clearTimeout(laughTimer.current);
      laughTimer.current = window.setTimeout(() => setFloatKey(0), 850);
    }
  };
  const prepareBattle = () => {
    if (battleSeed?.trim()) saveBattleSeed({ version: 1, bestJoke: battleSeed });
  };
  const protest = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (allowNavigation.current) {
      allowNavigation.current = false;
      return;
    }
    event.preventDefault();
    if (navigating.current) return;
    setCounts((current) => ({ ...current, 不服: current.不服 + 1 }));
    if (!protestArmed.current) {
      protestArmed.current = true;
      setMessage(EASTER_EGG_MESSAGES.protestPrompt);
      if (promptTimer.current !== null) window.clearTimeout(promptTimer.current);
      promptTimer.current = window.setTimeout(() => {
        protestArmed.current = false;
        setMessage("");
      }, 2_200);
      return;
    }
    protestArmed.current = false;
    navigating.current = true;
    if (promptTimer.current !== null) window.clearTimeout(promptTimer.current);
    setMessage(EASTER_EGG_MESSAGES.stubbornReaction);
    setProtesting(true);
    if (messageTimer.current !== null) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(""), 2200);
    if (protestTimer.current !== null) window.clearTimeout(protestTimer.current);
    protestTimer.current = window.setTimeout(() => setProtesting(false), 900);
    prepareBattle();
    const anchor = event.currentTarget;
    navigationTimer.current = window.setTimeout(() => {
      if (onNavigate) onNavigate("/battle");
      else {
        allowNavigation.current = true;
        anchor.click();
      }
    }, 650);
  };

  return (
    <div className="audience-reaction-bar" role="group" aria-label="观众反应">
      <div className="reaction-controls">
        {reactions.map((reaction) => (
          <button key={reaction} type="button" onClick={() => react(reaction)} aria-label={`${reaction} ${counts[reaction]}`}>
            {reaction} <span className="numeric">{counts[reaction]}</span>
          </button>
        ))}
        <Link className={protesting ? "is-protesting" : ""} href="/battle" onClick={protest} aria-label={`不服 ${counts.不服}`}>
          不服 <span className="numeric">{counts.不服}</span>
        </Link>
        <Link href="/battle" onClick={prepareBattle}>申请反击</Link>
      </div>
      {floatKey > 0 ? <span key={floatKey} className="reaction-float" aria-hidden="true">哈哈哈</span> : null}
      <p className="reaction-message" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
