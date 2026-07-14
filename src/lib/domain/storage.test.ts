import { afterEach, describe, expect, it, vi } from "vitest";

import type { RoastResult } from "./roast";
import {
  AI_ROAST_STORAGE_KEY,
  clearLatestRoast,
  loadLatestRoast,
  saveLatestRoast,
} from "./storage";

const validResult: RoastResult = {
  opening: "今晚的主角已经准备好了。",
  observations: [
    { title: "第一印象", body: "松弛得很有章法。", tag: "氛围感" },
    { title: "细节观察", body: "每个细节都坚持自己的想法。", tag: "坚持" },
    { title: "最终结论", body: "随手一拍也很有可信度。", tag: "可信度" },
  ],
  bestJoke: "你不是没有准备，你是把准备藏得太好了。",
  reverseCompliment: "能把随性贯彻到底，本身也是一种专业。",
  comedyTags: ["松弛", "坚定", "自然"],
  metrics: {
    atmosphere: 88,
    stubbornness: 72,
    casualCredibility: 91,
  },
  award: {
    title: "年度松弛感大奖",
    citation: "表彰你在毫不费力领域做出的持续贡献。",
  },
  safetyMode: "standard",
};

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("latest roast persistence", () => {
  it("saves and loads a validated result", () => {
    const storage = createMemoryStorage();

    saveLatestRoast(validResult, storage);

    expect(loadLatestRoast(storage)).toEqual(validResult);
  });

  it("persists only RoastResult fields and never image data", () => {
    const storage = createMemoryStorage();
    const unsafeInput = {
      ...validResult,
      image: {
        dataUrl: "data:image/png;base64,PRIVATE",
        mimeType: "image/png",
        size: 7,
      },
      request: { text: "private prompt" },
    };

    saveLatestRoast(unsafeInput, storage);

    const persisted = storage.getItem(AI_ROAST_STORAGE_KEY);
    expect(persisted).not.toContain("image");
    expect(persisted).not.toContain("data:image");
    expect(persisted).not.toContain("request");
    expect(JSON.parse(persisted ?? "{}")).toMatchObject({ version: 1, data: validResult });
  });

  it("strips unknown keys from nested result objects", () => {
    const storage = createMemoryStorage();
    const unsafeInput = {
      ...validResult,
      observations: validResult.observations.map((observation, index) =>
        index === 0 ? { ...observation, imageData: "private" } : observation,
      ),
      metrics: { ...validResult.metrics, rawImageScore: 99 },
      award: { ...validResult.award, requestData: "private" },
    };

    saveLatestRoast(unsafeInput, storage);

    expect(JSON.parse(storage.getItem(AI_ROAST_STORAGE_KEY) ?? "{}")).toMatchObject({ version: 1, data: validResult });
  });

  it("removes malformed JSON and returns null", () => {
    const storage = createMemoryStorage();
    storage.setItem(AI_ROAST_STORAGE_KEY, "{not-json");

    expect(loadLatestRoast(storage)).toBeNull();
    expect(storage.getItem(AI_ROAST_STORAGE_KEY)).toBeNull();
  });

  it("removes schema-invalid stored values and returns null", () => {
    const storage = createMemoryStorage();
    storage.setItem(AI_ROAST_STORAGE_KEY, JSON.stringify({ opening: "incomplete" }));

    expect(loadLatestRoast(storage)).toBeNull();
    expect(storage.getItem(AI_ROAST_STORAGE_KEY)).toBeNull();
  });

  it("clears the latest roast", () => {
    const storage = createMemoryStorage();
    saveLatestRoast(validResult, storage);

    clearLatestRoast(storage);

    expect(loadLatestRoast(storage)).toBeNull();
  });

  it("expires and removes a result after 24 hours", () => {
    const storage = createMemoryStorage();
    vi.spyOn(Date, "now").mockReturnValueOnce(1_000).mockReturnValue(1_000 + 24 * 60 * 60 * 1000 + 1);
    saveLatestRoast(validResult, storage);
    expect(loadLatestRoast(storage)).toBeNull();
    expect(storage.getItem(AI_ROAST_STORAGE_KEY)).toBeNull();
  });

  it("removes the previous unversioned storage format", () => {
    const storage = createMemoryStorage();
    storage.setItem(AI_ROAST_STORAGE_KEY, JSON.stringify(validResult));
    expect(loadLatestRoast(storage)).toBeNull();
    expect(storage.getItem(AI_ROAST_STORAGE_KEY)).toBeNull();
  });

  it("does not throw when storage rejects a save", () => {
    const storage = createMemoryStorage();
    storage.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };

    expect(() => saveLatestRoast(validResult, storage)).not.toThrow();
  });

  it("does not throw when storage rejects a clear", () => {
    const storage = createMemoryStorage();
    storage.removeItem = () => {
      throw new DOMException("Access denied", "SecurityError");
    };

    expect(() => clearLatestRoast(storage)).not.toThrow();
  });

  it("is a no-op without window or supplied storage", () => {
    vi.stubGlobal("window", undefined);

    expect(() => saveLatestRoast(validResult)).not.toThrow();
    expect(loadLatestRoast()).toBeNull();
    expect(() => clearLatestRoast()).not.toThrow();
  });
});
