import { z } from "zod";

export const BATTLE_SEED_STORAGE_KEY = "ai-roast-show:battle-seed";
const MAX_BEST_JOKE_LENGTH = 280;

export const battleSeedSchema = z.object({
  version: z.literal(1),
  bestJoke: z.string().trim().min(1).max(MAX_BEST_JOKE_LENGTH),
}).strict();

export type BattleSeed = z.infer<typeof battleSeedSchema>;

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function saveBattleSeed(seed: BattleSeed, storage?: Storage): void {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    const normalized = battleSeedSchema.parse({
      ...seed,
      bestJoke: seed.bestJoke.trim().slice(0, MAX_BEST_JOKE_LENGTH),
    });
    target.setItem(BATTLE_SEED_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Battle handoff remains best-effort when session storage is unavailable.
  }
}

export function loadBattleSeed(storage?: Storage): BattleSeed | null {
  const target = resolveStorage(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(BATTLE_SEED_STORAGE_KEY);
    if (raw === null) return null;
    return battleSeedSchema.parse(JSON.parse(raw));
  } catch {
    try { target.removeItem(BATTLE_SEED_STORAGE_KEY); } catch { /* best-effort cleanup */ }
    return null;
  }
}

export function clearBattleSeed(storage?: Storage): void {
  const target = resolveStorage(storage);
  if (!target) return;
  try { target.removeItem(BATTLE_SEED_STORAGE_KEY); } catch { /* best-effort clear */ }
}
