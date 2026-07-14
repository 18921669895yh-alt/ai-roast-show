import { z } from "zod";
import { roastResultSchema, type RoastResult } from "./roast";

export const AI_ROAST_STORAGE_KEY = "ai-roast-show:latest";
const STORAGE_VERSION = 1;
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;
const storedRoastSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  savedAt: z.number().int().nonnegative(),
  data: roastResultSchema,
}).strict();

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveLatestRoast(
  result: RoastResult,
  storage?: Storage,
): void {
  const target = resolveStorage(storage);
  if (!target) {
    return;
  }

  const validatedResult = roastResultSchema.parse(result);
  try {
    target.setItem(AI_ROAST_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, savedAt: Date.now(), data: validatedResult }));
  } catch {
    // Persistence is best-effort when storage is unavailable or full.
  }
}

export function loadLatestRoast(storage?: Storage): RoastResult | null {
  const target = resolveStorage(storage);
  if (!target) {
    return null;
  }

  try {
    const storedValue = target.getItem(AI_ROAST_STORAGE_KEY);
    if (storedValue === null) {
      return null;
    }

    const stored = storedRoastSchema.parse(JSON.parse(storedValue));
    if (Date.now() - stored.savedAt > STORAGE_TTL_MS || stored.savedAt > Date.now()) {
      target.removeItem(AI_ROAST_STORAGE_KEY);
      return null;
    }
    return stored.data;
  } catch {
    try {
      target.removeItem(AI_ROAST_STORAGE_KEY);
    } catch {
      // Invalid data is still ignored when storage cleanup is unavailable.
    }
    return null;
  }
}

export function clearLatestRoast(storage?: Storage): void {
  const target = resolveStorage(storage);
  if (!target) {
    return;
  }

  try {
    target.removeItem(AI_ROAST_STORAGE_KEY);
  } catch {
    // Clearing is best-effort when storage access is denied.
  }
}
