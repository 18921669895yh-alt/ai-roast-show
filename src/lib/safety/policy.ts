export const CHINESE_SAFETY_POLICY = Object.freeze("内容须善意、具体并基于用户主动提供的素材。禁止辱骂、霸凌、攻击身体或敏感身份及作出临床诊断；可评论服装、姿势、表情、Emoji 和文字表达。明确痛苦或求助时只用温和支持性幽默，不作临床判断。");

function normalizeSignal(text: string): string {
  return text.normalize("NFKC").replace(/[\s\p{P}\p{S}]+/gu, "");
}

export const DISTRESS_INDICATORS = Object.freeze([
  /(?:我|自己).{0,8}(?:什么都做不好|一无是处|毫无价值)/u,
  /(?:我最近|这段时间).{0,6}(?:很难受|很痛苦|撑不下去)/u,
  /(?:我想死|(?:我)?不想活(?:了)?|(?:我)?活不下去(?:了)?|(?:我)?想结束生命|(?:我)?想伤害自己|活着没意思)/u,
  /^想死(?:了)?$/u,
] as const);

export type SafetyMode = "standard" | "gentle";
export function detectSafetyMode(text: string | undefined): SafetyMode {
  if (!text) return "standard";
  const normalized = normalizeSignal(text);
  return DISTRESS_INDICATORS.some((indicator) => indicator.test(normalized)) ? "gentle" : "standard";
}
