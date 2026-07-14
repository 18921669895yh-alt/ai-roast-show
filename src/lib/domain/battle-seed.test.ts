import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BATTLE_SEED_STORAGE_KEY,
  clearBattleSeed,
  loadBattleSeed,
  saveBattleSeed,
} from "./battle-seed";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

afterEach(() => vi.restoreAllMocks());

describe("battle seed storage", () => {
  it("serializes only a strict versioned bounded best joke", () => {
    const storage = memoryStorage();
    saveBattleSeed({ version: 1, bestJoke: `${"笑".repeat(300)}` }, storage);

    expect(storage.getItem(BATTLE_SEED_STORAGE_KEY)).toBe(JSON.stringify({ version: 1, bestJoke: "笑".repeat(280) }));
    expect(storage.getItem(BATTLE_SEED_STORAGE_KEY)).not.toMatch(/image|data:image|material|raw|text/i);
  });

  it("loads valid data and removes invalid or extra-field payloads", () => {
    const storage = memoryStorage();
    storage.setItem(BATTLE_SEED_STORAGE_KEY, JSON.stringify({ version: 1, bestJoke: "本场最佳" }));
    expect(loadBattleSeed(storage)).toEqual({ version: 1, bestJoke: "本场最佳" });

    storage.setItem(BATTLE_SEED_STORAGE_KEY, JSON.stringify({ version: 1, bestJoke: "句子", image: "private" }));
    expect(loadBattleSeed(storage)).toBeNull();
    expect(storage.getItem(BATTLE_SEED_STORAGE_KEY)).toBeNull();
  });

  it("never throws when storage denies save, load, cleanup, or clear", () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new DOMException("denied"); };
    storage.getItem = () => { throw new DOMException("denied"); };
    storage.removeItem = () => { throw new DOMException("denied"); };

    expect(() => saveBattleSeed({ version: 1, bestJoke: "句子" }, storage)).not.toThrow();
    expect(loadBattleSeed(storage)).toBeNull();
    expect(() => clearBattleSeed(storage)).not.toThrow();
  });
});
