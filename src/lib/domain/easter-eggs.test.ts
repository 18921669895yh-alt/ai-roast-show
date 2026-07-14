import { describe, expect, it } from "vitest";
import { EASTER_EGG_COPY, EASTER_EGG_MESSAGES, getMotionProfile, shouldAnnounceInternalExit } from "./easter-eggs";

describe("Easter egg domain contract", () => {
  it("keeps all required event copy exact and centralized", () => {
    expect(EASTER_EGG_COPY).toBe(EASTER_EGG_MESSAGES);
    expect(EASTER_EGG_MESSAGES).toEqual(expect.objectContaining({
      longStare: "你已经盯着这句吐槽看了12秒。看来击中得比预计更深。",
      stubbornReaction: "系统检测到高浓度嘴硬反应。",
      reupload: "好，换证据了是吧？",
      deleteEvidence: "当事人正在尝试销毁喜剧证据。",
      sparseInput: "你提供的信息少得像工作群里的有效沟通。",
      strongComeback: "等等，这句不像临时发挥。你是不是偷偷准备过？",
      exitAttempt: "离场可以，但嘴硬数据已经保存。",
      exitClarification: "仅指已完成的文字结果；当前草稿和照片不会保存。",
      selfRoastTitle: "AI自我吐槽大会",
      selfRoastBody: "我最大的特点，就是每次说‘简单来说’，后面还能再写800字。",
      selfRoastEyebrow: "隐藏节目 · CH 00",
      selfRoastCloseLabel: "关闭AI自我吐槽大会",
    }));
  });

  it("returns a static motion profile for reduced motion", () => {
    expect(getMotionProfile(true)).toEqual({ duration: 0, continuous: false });
    expect(getMotionProfile(false).duration).toBeGreaterThan(0);
    expect(getMotionProfile(false).continuous).toBe(true);
  });

  it("announces only active same-origin internal navigation to a different route", () => {
    expect(shouldAnnounceInternalExit({ active: true, currentUrl: "https://show.test/roast", targetUrl: "https://show.test/report" })).toBe(true);
    expect(shouldAnnounceInternalExit({ active: false, currentUrl: "https://show.test/roast", targetUrl: "https://show.test/report" })).toBe(false);
    expect(shouldAnnounceInternalExit({ active: true, currentUrl: "https://show.test/roast", targetUrl: "https://other.test/report" })).toBe(false);
    expect(shouldAnnounceInternalExit({ active: true, currentUrl: "https://show.test/roast", targetUrl: "https://show.test/roast#stage" })).toBe(false);
  });
});
