export const LONG_STARE_MS = 12_000;
export const LONG_STARE_SESSION_KEY = "ai-roast-show:long-stare-seen";

export const EASTER_EGG_COPY = {
  longStare: "你已经盯着这句吐槽看了12秒。看来击中得比预计更深。",
  stubbornReaction: "系统检测到高浓度嘴硬反应。",
  protestPrompt: "再点一次就开打。",
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
} as const;

export const EASTER_EGG_MESSAGES = EASTER_EGG_COPY;

export function getMotionProfile(reduced: boolean): { duration: number; continuous: boolean } {
  return reduced ? { duration: 0, continuous: false } : { duration: 450, continuous: true };
}

export function shouldAnnounceInternalExit(input: { active: boolean; currentUrl: string; targetUrl: string }): boolean {
  if (!input.active) return false;
  try {
    const current = new URL(input.currentUrl);
    const target = new URL(input.targetUrl, current);
    return current.origin === target.origin && current.pathname !== target.pathname;
  } catch {
    return false;
  }
}
