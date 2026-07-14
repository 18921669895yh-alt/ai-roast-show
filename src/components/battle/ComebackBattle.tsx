"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import BattleScoreboard from "./BattleScoreboard";
import { comebackResultSchema } from "@/lib/ai/provider";
import { postJson } from "@/lib/api/client";
import {
  addBattleRound,
  createBattle,
  getFinalOutcome,
  isStrongComeback,
  MAX_BATTLE_LINE_LENGTH,
  type BattleRoundNumber,
  type BattleState,
} from "@/lib/domain/battle";
import { EASTER_EGG_MESSAGES } from "@/lib/domain/easter-eggs";
import { useExitAttemptToast } from "@/components/layout/useExitAttemptToast";

export interface BattleRoastContext {
  opening: string;
  bestJoke?: string;
  observations?: Array<{ title: string; body: string; tag: string }>;
}

const QUICK_REPLIES = [
  "你一个AI懂什么",
  "你说话也像年终总结",
  "你连身体都没有",
  "你先管好自己",
  "这也叫脱口秀？",
  "自定义反击",
] as const;

export default function ComebackBattle({ roastContext }: { roastContext: BattleRoastContext }) {
  const [battle, setBattle] = useState<BattleState>(createBattle);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [degraded, setDegraded] = useState(false);
  const [strongMessage, setStrongMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const customInputRef = useRef<HTMLTextAreaElement | null>(null);
  const roundHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const outcomeHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const pendingFocusRef = useRef<"round" | "outcome" | "input" | null>(null);
  const strongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { exitMessage, exitClarification, dismissExitMessage } = useExitAttemptToast(Boolean(draft.trim() || battle.rounds.length || battle.status === "submitting"));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      submittingRef.current = false;
      controllerRef.current?.abort();
      if (strongTimerRef.current) clearTimeout(strongTimerRef.current);
    };
  }, []);

  const round = (battle.rounds.length + 1) as BattleRoundNumber;
  const finished = battle.status === "finished";

  useEffect(() => {
    if (pendingFocusRef.current === "outcome") outcomeHeadingRef.current?.focus();
    else if (pendingFocusRef.current === "round") roundHeadingRef.current?.focus();
    else if (pendingFocusRef.current === "input") customInputRef.current?.focus();
    pendingFocusRef.current = null;
  }, [battle.rounds.length, battle.status]);

  async function submitLine(rawLine: string) {
    const userLine = rawLine.trim();
    if (!userLine || userLine.length > MAX_BATTLE_LINE_LENGTH || finished || submittingRef.current) return;
    submittingRef.current = true;
    setBattle((current) => ({ ...current, status: "submitting" }));
    setError("");
    setDegraded(false);
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    try {
      const envelope = await postJson<unknown>("/api/comeback", {
        round,
        userLine,
        priorTurns: battle.rounds.slice(-5).map((turn) => ({ userLine: turn.userLine, reply: turn.reply })),
        roastContext,
      }, { signal: controller.signal });
      const result = comebackResultSchema.parse(envelope.data);
      if (!mountedRef.current || controller.signal.aborted) return;
      const nextBattle = addBattleRound(battle, {
        round,
        userLine,
        reply: result.reply,
        scores: { wit: result.wit, force: result.force, stubbornness: result.stubbornness, support: result.support },
      });
      if (nextBattle.status === "finished") {
        const outcome = getFinalOutcome(nextBattle);
        setAnnouncement(`${result.reply} ${outcome}`);
        pendingFocusRef.current = "outcome";
      } else {
        setAnnouncement(`${result.reply} ROUND ${nextBattle.rounds.length + 1}`);
        pendingFocusRef.current = "round";
      }
      setBattle(nextBattle);
      setDraft("");
      setDegraded(envelope.meta.degraded);
      if (isStrongComeback(userLine)) {
        setStrongMessage(EASTER_EGG_MESSAGES.strongComeback);
        if (strongTimerRef.current) clearTimeout(strongTimerRef.current);
        strongTimerRef.current = setTimeout(() => setStrongMessage(""), 4_500);
      }
    } catch (caught) {
      if (!mountedRef.current || controller.signal.aborted || (caught instanceof DOMException && caught.name === "AbortError")) return;
      setBattle((current) => ({ ...current, status: "idle" }));
      setError("现场信号不稳，请保留这句再试一次。");
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        submittingRef.current = false;
      }
    }
  }

  function submitCustom(event: FormEvent) {
    event.preventDefault();
    void submitLine(draft);
  }

  function cancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    submittingRef.current = false;
    setBattle((current) => current.status === "finished" ? current : { ...current, status: "idle" });
  }

  function chooseQuickReply(reply: typeof QUICK_REPLIES[number]) {
    if (reply === "自定义反击") {
      customInputRef.current?.focus();
      return;
    }
    setDraft(reply);
    void submitLine(reply);
  }

  function reset() {
    cancel();
    setBattle(createBattle());
    setDraft("");
    setError("");
    setDegraded(false);
    setStrongMessage("");
    setAnnouncement("ROUND 1");
    pendingFocusRef.current = "input";
  }

  return (
    <section className="comeback-battle" aria-label="五回合即兴对决">
      <header className="battle-round-header">
        <div className="round-bell" key={battle.rounds.length} aria-hidden="true">🔔</div>
        <div>
          <p className="eyebrow">CH 04 · 即兴对决</p>
          <h1 ref={roundHeadingRef} tabIndex={-1}>{finished ? "对决结束" : `ROUND ${round}`}</h1>
          <p>{finished ? "五个回合，句句算数。" : `最多五回合 · 当前第 ${round} 回合`}</p>
        </div>
      </header>

      <div className="battle-ring" aria-label="对战双方">
        <section className="battle-corner battle-corner-user" aria-labelledby="user-player-title">
          <p className="corner-label">LEFT CORNER</p>
          <h2 id="user-player-title">嘴硬选手</h2>
          <p>{roastContext.bestJoke ?? roastContext.opening}</p>
        </section>
        <span className="battle-versus" aria-hidden="true">VS</span>
        <section className="battle-corner battle-corner-ai" aria-labelledby="ai-player-title">
          <p className="corner-label">RIGHT CORNER</p>
          <h2 id="ai-player-title">没有生活但很会说的选手</h2>
          <p>负责接住你的话，再把它拐回来。</p>
        </section>
      </div>

      {battle.rounds.length ? (
        <ol className="battle-history" aria-label="对决记录">
          {battle.rounds.map((turn) => (
            <li className="battle-turn" key={turn.round}>
              <p className="turn-number">ROUND {turn.round}</p>
              <div className="turn-lines">
                <blockquote><span>嘴硬选手</span>{turn.userLine}</blockquote>
                <blockquote><span>AI 选手</span>{turn.reply}</blockquote>
              </div>
              <BattleScoreboard scores={turn.scores} />
            </li>
          ))}
        </ol>
      ) : null}

      {degraded ? <p className="battle-degraded" role="status">已切换安全演示内容。</p> : null}
      {strongMessage ? <p className="strong-comeback" role="status">{strongMessage}</p> : null}

      {finished ? (
        <section className="battle-finale" aria-labelledby="battle-outcome">
          <p className="eyebrow">FINAL CALL</p>
          <h2 id="battle-outcome" ref={outcomeHeadingRef} tabIndex={-1}>{getFinalOutcome(battle)}</h2>
          <p>这只是即兴喜剧判定，不代表对任何人的真实评价。</p>
          <nav className="result-actions" aria-label="对决结束操作">
            <Link className="button-primary" href="/report">领取吐槽报告</Link>
            <button className="button-secondary" type="button" onClick={reset}>再来一局</button>
            <Link className="button-secondary" href="/result">返回本场吐槽</Link>
          </nav>
        </section>
      ) : null}

      <form className="battle-controls" onSubmit={submitCustom} aria-busy={battle.status === "submitting"}>
        <fieldset disabled={finished || battle.status === "submitting"}>
          <legend>快捷反击</legend>
          <div className="quick-comebacks">
            {QUICK_REPLIES.map((reply) => <button type="button" key={reply} onClick={() => chooseQuickReply(reply)}>{reply}</button>)}
          </div>
          <label htmlFor="battle-line">来，回我一句</label>
          <textarea
            id="battle-line"
            ref={customInputRef}
            maxLength={MAX_BATTLE_LINE_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="来，回我一句"
            disabled={finished}
          />
          <div className="battle-input-meta"><span>{draft.length} / {MAX_BATTLE_LINE_LENGTH}</span><button className="button-primary" type="submit">送出反击</button></div>
        </fieldset>
        {battle.status === "submitting" ? <button className="button-secondary cancel-comeback" type="button" onClick={cancel}>取消反击</button> : null}
        {error ? <div className="battle-error" role="alert"><p>{error}</p><button type="button" onClick={() => void submitLine(draft)}>重新反击</button></div> : null}
      </form>
      <p className="sr-only" role="status" aria-label="对决播报" aria-live="polite" aria-atomic="true">{announcement}</p>
      {exitMessage ? <aside className="easter-toast" role="status" aria-label="离场提示"><span><strong>{exitMessage}</strong><small>{exitClarification}</small></span><button type="button" aria-label="关闭离场提示" onClick={dismissExitMessage}>×</button></aside> : null}
    </section>
  );
}
