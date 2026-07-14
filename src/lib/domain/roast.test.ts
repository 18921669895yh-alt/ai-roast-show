import { describe, expect, it } from "vitest";

import {
  ROAST_TEXT_LIMITS,
  roastLevelSchema,
  roastModeSchema,
  roastRequestSchema,
  roastResultSchema,
  safetyModeSchema,
  type RoastResult,
} from "./roast";

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

describe("roastResultSchema", () => {
  it("accepts a complete roast result", () => {
    expect(roastResultSchema.parse(validResult)).toEqual(validResult);
  });

  it("rejects fewer than three observations", () => {
    const result = roastResultSchema.safeParse({
      ...validResult,
      observations: validResult.observations.slice(0, 2),
    });

    expect(result.success).toBe(false);
  });

  it.each([-1, 101])("rejects comedy metrics outside 0..100: %i", (value) => {
    const result = roastResultSchema.safeParse({
      ...validResult,
      metrics: { ...validResult.metrics, atmosphere: value },
    });

    expect(result.success).toBe(false);
  });
});

describe("roastRequestSchema", () => {
  it("requires text or an image", () => {
    expect(
      roastRequestSchema.safeParse({ level: "gentle", mode: "chat" }).success,
    ).toBe(false);
    expect(
      roastRequestSchema.safeParse({
        text: "   ",
        level: "gentle",
        mode: "chat",
      }).success,
    ).toBe(false);
  });

  it("accepts and trims text material", () => {
    expect(
      roastRequestSchema.parse({
        text: "  roast this  ",
        level: "familiar",
        mode: "bio",
      }).text,
    ).toBe("roast this");
  });

  it("accepts a supported image", () => {
    const request = {
      image: {
        dataUrl: "data:image/webp;base64,UklGRgAAAABXRUJQ",
        mimeType: "image/webp",
        size: 12,
      },
      level: "stage",
      mode: "photo",
    };

    expect(roastRequestSchema.parse(request)).toEqual(request);
  });

  it.each([
    {
      label: "unsupported data URL",
      image: {
        dataUrl: "data:image/gif;base64,R0lGODlh",
        mimeType: "image/jpeg",
        size: 8,
      },
    },
    {
      label: "unsupported MIME type",
      image: {
        dataUrl: "data:image/jpeg;base64,/9j/",
        mimeType: "image/gif",
        size: 8,
      },
    },
    {
      label: "oversize image",
      image: {
        dataUrl: "data:image/png;base64,iVBORw==",
        mimeType: "image/png",
        size: 10 * 1024 * 1024 + 1,
      },
    },
  ])("rejects $label", ({ image }) => {
    expect(
      roastRequestSchema.safeParse({
        image,
        level: "gentle",
        mode: "photo",
      }).success,
    ).toBe(false);
  });
});

describe("roast option schemas", () => {
  it.each(["gentle", "familiar", "stage"])(
    "accepts roast level %s",
    (level) => {
      expect(roastLevelSchema.parse(level)).toBe(level);
    },
  );

  it("rejects an unsupported roast level", () => {
    expect(roastLevelSchema.safeParse("extreme").success).toBe(false);
  });

  it.each(["photo", "outfit", "moments", "chat", "bio", "random"])(
    "accepts roast mode %s",
    (mode) => {
      expect(roastModeSchema.parse(mode)).toBe(mode);
    },
  );

  it("rejects an unsupported roast mode", () => {
    expect(roastModeSchema.safeParse("video").success).toBe(false);
  });

  it.each(["standard", "gentle"])("accepts safety mode %s", (mode) => {
    expect(safetyModeSchema.parse(mode)).toBe(mode);
  });

  it("rejects an unsupported safety mode", () => {
    expect(safetyModeSchema.safeParse("unsafe").success).toBe(false);
  });
});

describe("roast result boundaries", () => {
  it.each([
    ["opening", "opening", ROAST_TEXT_LIMITS.opening],
    ["bestJoke", "bestJoke", ROAST_TEXT_LIMITS.bestJoke],
    ["reverse compliment", "reverseCompliment", ROAST_TEXT_LIMITS.reverseCompliment],
  ] as const)("accepts %s at its bound and rejects one character more", (_label, field, limit) => {
    expect(roastResultSchema.safeParse({ ...validResult, [field]: "界".repeat(limit) }).success).toBe(true);
    expect(roastResultSchema.safeParse({ ...validResult, [field]: "界".repeat(limit + 1) }).success).toBe(false);
  });

  it.each([
    ["title", ROAST_TEXT_LIMITS.title],
    ["body", ROAST_TEXT_LIMITS.observationBody],
    ["tag", ROAST_TEXT_LIMITS.tag],
  ] as const)("bounds observation %s", (field, limit) => {
    const withValue = (value: string) => ({ ...validResult, observations: validResult.observations.map((item, index) => index ? item : { ...item, [field]: value }) });
    expect(roastResultSchema.safeParse(withValue("界".repeat(limit))).success).toBe(true);
    expect(roastResultSchema.safeParse(withValue("界".repeat(limit + 1))).success).toBe(false);
  });

  it("bounds comedy tags and award copy", () => {
    expect(roastResultSchema.safeParse({ ...validResult, comedyTags: ["界".repeat(ROAST_TEXT_LIMITS.tag + 1), "二", "三"] }).success).toBe(false);
    expect(roastResultSchema.safeParse({ ...validResult, award: { title: "界".repeat(ROAST_TEXT_LIMITS.title + 1), citation: "词" } }).success).toBe(false);
    expect(roastResultSchema.safeParse({ ...validResult, award: { title: "奖", citation: "界".repeat(ROAST_TEXT_LIMITS.awardCitation + 1) } }).success).toBe(false);
  });
  it("rejects more than five observations", () => {
    expect(
      roastResultSchema.safeParse({
        ...validResult,
        observations: Array.from({ length: 6 }, () => validResult.observations[0]),
      }).success,
    ).toBe(false);
  });

  it.each([2, 4])("rejects %i comedy tags", (tagCount) => {
    expect(
      roastResultSchema.safeParse({
        ...validResult,
        comedyTags: Array.from({ length: tagCount }, () => "tag"),
      }).success,
    ).toBe(false);
  });

  it("rejects non-integer comedy metrics", () => {
    expect(
      roastResultSchema.safeParse({
        ...validResult,
        metrics: { ...validResult.metrics, stubbornness: 50.5 },
      }).success,
    ).toBe(false);
  });

  it.each(["opening", "bestJoke", "reverseCompliment"] as const)(
    "requires nonempty %s",
    (field) => {
      expect(
        roastResultSchema.safeParse({ ...validResult, [field]: "" }).success,
      ).toBe(false);
    },
  );

  it.each(["title", "body", "tag"] as const)(
    "requires nonempty observation %s",
    (field) => {
      const observations = validResult.observations.map((observation, index) =>
        index === 0 ? { ...observation, [field]: "" } : observation,
      );

      expect(
        roastResultSchema.safeParse({ ...validResult, observations }).success,
      ).toBe(false);
    },
  );

  it.each(["title", "citation"] as const)(
    "requires nonempty award %s",
    (field) => {
      expect(
        roastResultSchema.safeParse({
          ...validResult,
          award: { ...validResult.award, [field]: "" },
        }).success,
      ).toBe(false);
    },
  );

  it("requires nonempty comedy tag strings", () => {
    expect(
      roastResultSchema.safeParse({
        ...validResult,
        comedyTags: ["one", "", "three"],
      }).success,
    ).toBe(false);
  });
});

describe("roast request boundaries", () => {
  it("accepts text with exactly 500 characters", () => {
    expect(
      roastRequestSchema.safeParse({
        text: "x".repeat(500),
        level: "gentle",
        mode: "chat",
      }).success,
    ).toBe(true);
  });

  it("rejects text longer than 500 characters", () => {
    expect(
      roastRequestSchema.safeParse({
        text: "x".repeat(501),
        level: "gentle",
        mode: "chat",
      }).success,
    ).toBe(false);
  });

  it("rejects a MIME type that does not match the data URL", () => {
    expect(
      roastRequestSchema.safeParse({
        image: {
          dataUrl: "data:image/jpeg;base64,/9j/",
          mimeType: "image/png",
          size: 3,
        },
        level: "gentle",
        mode: "photo",
      }).success,
    ).toBe(false);
  });

  it.each([0, -1])("rejects non-positive image size %i", (size) => {
    expect(
      roastRequestSchema.safeParse({
        image: {
          dataUrl: "data:image/png;base64,iVBORw==",
          mimeType: "image/png",
          size,
        },
        level: "gentle",
        mode: "photo",
      }).success,
    ).toBe(false);
  });

  it.each([
    ["jpeg", "image/jpeg", "/9j/", 3],
    ["png", "image/png", "iVBORw0KGgo=", 8],
    ["webp", "image/webp", "UklGRgAAAABXRUJQ", 12],
  ] as const)("accepts a valid %s image", (subtype, mimeType, data, size) => {
    expect(
      roastRequestSchema.safeParse({
        image: {
          dataUrl: `data:image/${subtype};base64,${data}`,
          mimeType,
          size,
        },
        level: "stage",
        mode: "photo",
      }).success,
    ).toBe(true);
  });

  it("rejects an empty Base64 payload", () => {
    expect(
      roastRequestSchema.safeParse({
        image: {
          dataUrl: "data:image/png;base64,",
          mimeType: "image/png",
          size: 1,
        },
        level: "gentle",
        mode: "photo",
      }).success,
    ).toBe(false);
  });

  it.each(["not-base64!", "YQ"])(
    "rejects malformed Base64 payload %s",
    (payload) => {
      expect(
        roastRequestSchema.safeParse({
          image: {
            dataUrl: `data:image/png;base64,${payload}`,
            mimeType: "image/png",
            size: 1,
          },
          level: "gentle",
          mode: "photo",
        }).success,
      ).toBe(false);
    },
  );

  it("rejects a declared size that differs from the decoded payload", () => {
    expect(
      roastRequestSchema.safeParse({
        image: {
          dataUrl: "data:image/png;base64,iVBORw==",
          mimeType: "image/png",
          size: 5,
        },
        level: "gentle",
        mode: "photo",
      }).success,
    ).toBe(false);
  });

  it("rejects content whose magic signature does not match its MIME type", () => {
    expect(roastRequestSchema.safeParse({ image: { dataUrl: "data:image/png;base64,UklGRgAAAABXRUJQ", mimeType: "image/png", size: 12 }, level: "stage", mode: "photo" }).success).toBe(false);
  });

  it("rejects unknown request and image fields", () => {
    expect(roastRequestSchema.safeParse({ text: "x", level: "gentle", mode: "chat", unknown: true }).success).toBe(false);
    expect(roastRequestSchema.safeParse({ image: { dataUrl: "data:image/png;base64,iVBORw0KGgo=", mimeType: "image/png", size: 8, unknown: true }, level: "gentle", mode: "photo" }).success).toBe(false);
  });

  it("rejects an actually oversized payload before decoding", () => {
    const oversizedPayload = `${"AAAA".repeat(3_495_253)}AAA=`;

    expect(
      roastRequestSchema.safeParse({
        image: {
          dataUrl: `data:image/png;base64,${oversizedPayload}`,
          mimeType: "image/png",
          size: 10 * 1024 * 1024,
        },
        level: "gentle",
        mode: "photo",
      }).success,
    ).toBe(false);
  });
});

describe("roast result string normalization", () => {
  it.each(["opening", "bestJoke", "reverseCompliment"] as const)(
    "rejects whitespace-only %s",
    (field) => {
      expect(
        roastResultSchema.safeParse({ ...validResult, [field]: "   " }).success,
      ).toBe(false);
    },
  );

  it.each(["title", "body", "tag"] as const)(
    "rejects whitespace-only observation %s",
    (field) => {
      const observations = validResult.observations.map((observation, index) =>
        index === 0 ? { ...observation, [field]: "   " } : observation,
      );

      expect(
        roastResultSchema.safeParse({ ...validResult, observations }).success,
      ).toBe(false);
    },
  );

  it.each(["title", "citation"] as const)(
    "rejects whitespace-only award %s",
    (field) => {
      expect(
        roastResultSchema.safeParse({
          ...validResult,
          award: { ...validResult.award, [field]: "   " },
        }).success,
      ).toBe(false);
    },
  );

  it("rejects a whitespace-only comedy tag", () => {
    expect(
      roastResultSchema.safeParse({
        ...validResult,
        comedyTags: ["one", "   ", "three"],
      }).success,
    ).toBe(false);
  });

  it("trims every result string", () => {
    const paddedResult = {
      ...validResult,
      opening: `  ${validResult.opening}  `,
      bestJoke: `  ${validResult.bestJoke}  `,
      reverseCompliment: `  ${validResult.reverseCompliment}  `,
      comedyTags: validResult.comedyTags.map((tag) => `  ${tag}  `),
      observations: validResult.observations.map((observation) => ({
        title: `  ${observation.title}  `,
        body: `  ${observation.body}  `,
        tag: `  ${observation.tag}  `,
      })),
      award: {
        title: `  ${validResult.award.title}  `,
        citation: `  ${validResult.award.citation}  `,
      },
    };

    expect(roastResultSchema.parse(paddedResult)).toEqual(validResult);
  });
});
