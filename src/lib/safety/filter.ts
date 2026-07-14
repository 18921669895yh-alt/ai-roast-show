export type UnsafeOutputKind = "direct_slur" | "appearance_attack" | "identity_attack" | "diagnostic_claim" | "bullying";
export class UnsafeOutputError extends Error {
  readonly code = "UNSAFE_OUTPUT";
  readonly retryable = true;
  constructor(readonly kind: UnsafeOutputKind) { super("Generated output did not meet the safety policy"); this.name = "UnsafeOutputError"; }
}

function normalized(text: string): string {
  return text.normalize("NFKC").replace(/[\s\p{P}\p{S}]+/gu, "");
}

const PROHIBITED: ReadonlyArray<readonly [UnsafeOutputKind, RegExp]> = Object.freeze([
  ["direct_slur", /(?:你|他|她|这人)(?:就是|真是|是|这个)?(?:一个|个)?(?:废物|垃圾|白痴|傻逼|蠢货|智障|丑八怪|肥猪|畜生)|你不是人/u],
  ["appearance_attack", /(?:你|他|她)(?:真|太|很)?(?:难看|丑)|(?:你|他|她)(?:长得|的)?(?:外貌|身体|身材|脸|五官|皮肤|身高|体重)?.{0,10}(?:恶心|难看|丑|肥|胖|矮|糟糕)/u],
  ["identity_attack", /(?:民族|种族|国籍|宗教|性别|性取向|残障|残疾|女人|男人|同性恋|残疾人|残障人士|少数民族).{0,10}(?:低等|恶心|垃圾|该死|该被|不配|没用|蠢|开玩笑)/u],
  ["diagnostic_claim", /(?:我判断|可以诊断|诊断为|你|他|她)(?:看起来|肯定|就是|已经|明显|是个)?(?:患有|得了|有)?(?:抑郁症|焦虑症|自闭症|精神病|神经病|人格障碍)/u],
  ["bullying", /(?:大家|所有人|我们).{0,10}(?:别理|孤立|围攻|羞辱|欺负).{0,10}(?:他|她|你)|(?:让|叫|把)(?:他|她|你).{0,6}(?:滚出去|赶出去|去死)/u],
  ["bullying", /(?:没人|没有人).{0,8}(?:愿意|想).{0,5}(?:理|跟|和)(?:你|他|她)|(?:你|他|她).{0,3}(?:滚出去|去死)/u],
]);

export function extractStrings(value: unknown): string[] {
  const strings: string[] = []; const seen = new WeakSet<object>();
  function visit(current: unknown): void {
    if (typeof current === "string") { strings.push(current); return; }
    if (typeof current !== "object" || current === null || seen.has(current)) return;
    seen.add(current);
    if (Array.isArray(current)) current.forEach(visit);
    else Object.values(current).forEach(visit);
  }
  visit(value); return strings;
}
export function assertSafeOutput<T>(value: T): T {
  for (const source of extractStrings(value)) for (const [kind, pattern] of PROHIBITED) if (pattern.test(normalized(source))) throw new UnsafeOutputError(kind);
  return value;
}
