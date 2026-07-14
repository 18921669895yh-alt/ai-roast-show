import { describe, expect, it } from "vitest";

import {
  addBattleRound,
  createBattle,
  getFinalOutcome,
  normalizeScores,
  type BattleRound,
} from "./battle";

const round: BattleRound = {
  round: 1,
  userLine: "你先管好自己",
  reply: "我没有生活，但你的逻辑也没有下班时间。",
  scores: { wit: 61, force: 62, stubbornness: 63, support: 64 },
};

describe("battle domain", () => {
  it("finishes after five immutable rounds and refuses a sixth", () => {
    const original = createBattle();
    let state = original;
    for (let index = 0; index < 5; index += 1) {
      state = addBattleRound(state, { ...round, round: (index + 1) as BattleRound["round"] });
    }

    expect(original).toEqual({ rounds: [], status: "idle" });
    expect(state.rounds).toHaveLength(5);
    expect(state.status).toBe("finished");
    expect(() => addBattleRound(state, round)).toThrow(/five|5/i);
  });

  it("clamps and rounds defensive score input", () => {
    expect(normalizeScores({ wit: 120.4, force: -1, stubbornness: 82.7, support: Number.NaN }))
      .toEqual({ wit: 100, force: 0, stubbornness: 83, support: 0 });
  });

  it("rejects invalid round order and oversized user lines without mutating state", () => {
    const state = createBattle();
    expect(() => addBattleRound(state, { ...round, round: 2 })).toThrow(/round/i);
    expect(() => addBattleRound(state, { ...round, userLine: "字".repeat(2_001) })).toThrow(/2000/i);
    expect(state).toEqual({ rounds: [], status: "idle" });
  });

  it("rejects an oversized AI reply defensively", () => {
    const state = createBattle();
    expect(() => addBattleRound(state, { ...round, reply: "回".repeat(4_001) })).toThrow(/4000|reply/i);
    expect(state.rounds).toHaveLength(0);
  });

  it("refuses to decide an outcome before exactly five finished rounds", () => {
    expect(() => getFinalOutcome(createBattle())).toThrow(/finished|five|5/i);
    expect(() => getFinalOutcome({ status: "finished", rounds: [round] })).toThrow(/finished|five|5/i);
  });

  it.each([
    [{ wit: 20, force: 20, stubbornness: 20, support: 20 }, "用户获胜"],
    [{ wit: 90, force: 90, stubbornness: 70, support: 90 }, "AI险胜"],
    [{ wit: 70, force: 70, stubbornness: 90, support: 50 }, "双方嘴都很硬"],
    [{ wit: 50, force: 50, stubbornness: 50, support: 50 }, "本场无人认输"],
  ] as const)("returns only an approved aggregate outcome", (scores, expected) => {
    const rounds = Array.from({ length: 5 }, (_, index) => ({ ...round, round: (index + 1) as BattleRound["round"], scores }));
    expect(getFinalOutcome({ status: "finished", rounds })).toBe(expected);
  });
});
