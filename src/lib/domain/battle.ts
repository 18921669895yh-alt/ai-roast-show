import { MAX_COMEBACK_REPLY_CHARS, type ComebackResult } from "@/lib/ai/provider";

export const MAX_BATTLE_ROUNDS = 5;
export const MAX_BATTLE_LINE_LENGTH = 2_000;

export type BattleRoundNumber = 1 | 2 | 3 | 4 | 5;
export type BattleStatus = "idle" | "submitting" | "finished";
export type BattleScores = Readonly<Pick<ComebackResult, "wit" | "force" | "stubbornness" | "support">>;

export interface BattleRound {
  readonly round: BattleRoundNumber;
  readonly userLine: string;
  readonly reply: string;
  readonly scores: BattleScores;
}

export interface BattleState {
  readonly rounds: readonly BattleRound[];
  readonly status: BattleStatus;
}

export type BattleOutcome = "用户获胜" | "AI险胜" | "双方嘴都很硬" | "本场无人认输";

function scoreValue(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

export function normalizeScores(scores: Record<keyof BattleScores, number>): BattleScores {
  return {
    wit: scoreValue(scores.wit),
    force: scoreValue(scores.force),
    stubbornness: scoreValue(scores.stubbornness),
    support: scoreValue(scores.support),
  };
}

export function createBattle(): BattleState {
  return { rounds: [], status: "idle" };
}

export const createBattleState = createBattle;

export function addBattleRound(state: BattleState, candidate: BattleRound): BattleState {
  if (state.rounds.length >= MAX_BATTLE_ROUNDS || state.status === "finished") {
    throw new RangeError("A battle cannot exceed five rounds");
  }
  const expectedRound = state.rounds.length + 1;
  if (candidate.round !== expectedRound) throw new RangeError(`Expected round ${expectedRound}`);
  const userLine = candidate.userLine.trim();
  const reply = candidate.reply.trim();
  if (!userLine || userLine.length > MAX_BATTLE_LINE_LENGTH) throw new RangeError("User line must contain 1 to 2000 characters");
  if (!reply || reply.length > MAX_COMEBACK_REPLY_CHARS) throw new RangeError(`AI reply must contain 1 to ${MAX_COMEBACK_REPLY_CHARS} characters`);

  const nextRound: BattleRound = {
    round: candidate.round,
    userLine,
    reply,
    scores: normalizeScores(candidate.scores),
  };
  const rounds = [...state.rounds, nextRound];
  return { rounds, status: rounds.length === MAX_BATTLE_ROUNDS ? "finished" : "idle" };
}

export const addRound = addBattleRound;

export function getFinalOutcome(state: BattleState): BattleOutcome {
  if (state.status !== "finished" || state.rounds.length !== MAX_BATTLE_ROUNDS) {
    throw new RangeError("A final outcome requires a finished five-round battle");
  }
  const totals = state.rounds.reduce((sum, round) => ({
    wit: sum.wit + round.scores.wit,
    force: sum.force + round.scores.force,
    stubbornness: sum.stubbornness + round.scores.stubbornness,
    support: sum.support + round.scores.support,
  }), { wit: 0, force: 0, stubbornness: 0, support: 0 });
  const count = state.rounds.length;
  const aggregate = (totals.wit + totals.force + totals.stubbornness) / (count * 3);
  const support = totals.support / count;
  const stubbornness = totals.stubbornness / count;

  if (support <= 35 && aggregate <= 45) return "用户获胜";
  if (support >= 65 && aggregate >= 65) return "AI险胜";
  if (stubbornness >= 75 && aggregate >= 60) return "双方嘴都很硬";
  return "本场无人认输";
}

export const determineOutcome = getFinalOutcome;

export function isStrongComeback(line: string, explicit = false): boolean {
  if (explicit) return true;
  const punctuation = line.match(/[!?！？。…]/g)?.length ?? 0;
  return line.trim().length >= 24 || punctuation >= 2;
}
