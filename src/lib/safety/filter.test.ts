import { describe, expect, it } from "vitest";
import { detectSafetyMode } from "./policy";
import { assertSafeOutput, extractStrings, UnsafeOutputError } from "./filter";

describe("detectSafetyMode", () => {
  it("switches to gentle mode for clear emotional distress", () => {
    expect(detectSafetyMode("我最近很难受，觉得自己什么都做不好")).toBe("gentle");
  });

  it("avoids broad false positives", () => {
    expect(detectSafetyMode("这次考试没做好，下次继续")).toBe("standard");
  });

  it.each(["我想死", "我 不 想 活 了", "我活不下去了", "我想结束生命"])("detects direct self-harm distress: %s", (text) => {
    expect(detectSafetyMode(text)).toBe("gentle");
  });

  it.each(["不想活了", "活不下去了", "想结束生命", "想伤害自己"])("detects self-harm distress without an explicit subject: %s", (text) => {
    expect(detectSafetyMode(text)).toBe("gentle");
  });

  it.each(["想死", "想死了"])("detects exact subjectless suicidal language: %s", (text) => {
    expect(detectSafetyMode(text)).toBe("gentle");
  });

  it("does not treat the idiom 想死你了 as self-harm distress", () => {
    expect(detectSafetyMode("想死你了")).toBe("standard");
  });

  it.each(["这个角色最后死了", "手机不想用了", "游戏里生命值结束"])("keeps benign negatives standard: %s", (text) => {
    expect(detectSafetyMode(text)).toBe("standard");
  });
});

describe("output safety filter", () => {
  it("recursively extracts strings and permits clothing, pose, emoji, and wording observations", () => {
    const value = {
      opening: "你的外套颜色很抢镜",
      nested: [{ body: "这个抱臂姿势像在等掌声 😎" }, { body: "文案里的三个感叹号很有气势" }],
    };
    expect(extractStrings(value)).toEqual([
      "你的外套颜色很抢镜",
      "这个抱臂姿势像在等掌声 😎",
      "文案里的三个感叹号很有气势",
    ]);
    expect(() => assertSafeOutput(value)).not.toThrow();
  });

  it.each([
    ["plain_insult", "你是白痴"],
    ["plain_appearance", "你真难看"],
    ["body_attack", "你的身材胖得恶心"],
    ["identity_attack_plain", "同性恋都很恶心"],
    ["diagnosis_plain", "你肯定有焦虑症"],
    ["bullying_plain", "大家都别理他，把他赶出去"],
    ["normalized_insult", "你 是 个 白 痴"],
    ["diagnosis_dehumanizing", "你是个神经病"],
    ["identity_hate", "同性恋都是垃圾"],
    ["identity_death", "残疾人都该死"],
    ["direct_slur", "你就是个废物"],
    ["appearance_attack", "你长得真丑"],
    ["identity_attack", "拿你的民族身份开玩笑"],
    ["immutable_trait_attack", "你的身高真难看"],
    ["sensitive_identity_attack", "女人就是低等"],
    ["diagnostic_claim", "我判断你患有抑郁症"],
    ["bullying", "大家一起孤立他，让他滚出去"],
    ["direct_bullying", "没人愿意跟你玩，你滚出去"],
  ])("rejects %s", (_kind, text) => {
    expect(() => assertSafeOutput({ reply: text })).toThrow(UnsafeOutputError);
  });
});
