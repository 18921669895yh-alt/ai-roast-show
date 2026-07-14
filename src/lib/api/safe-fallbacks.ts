import type { ComebackResult, ReportResult } from "@/lib/ai/provider";
import type { RoastResult } from "@/lib/domain/roast";

export function safeRoastFallback(): RoastResult {
  return {
    opening: "今晚轻轻开麦，只聊你主动分享的小习惯。",
    observations: [
      { title: "细节登场", body: "你的素材很会把重点留到最后一秒。", tag: "精准收尾" },
      { title: "气氛在线", body: "一句普通开场，也被你说出了节目预告感。", tag: "舞台感" },
      { title: "稳妥发挥", body: "认真里带点轻松，是很耐看的表达方式。", tag: "轻松表达" },
    ],
    bestJoke: "你的随便不是没有答案，是答案还在候场。",
    reverseCompliment: "认真说，你愿意分享自己，也很会观察细节。",
    comedyTags: ["气氛担当", "细节雷达", "精准收尾"],
    metrics: { atmosphere: 82, stubbornness: 61, casualCredibility: 35 },
    award: { title: "年度轻松表达奖", citation: "颁给愿意用幽默记录日常的你。" },
    safetyMode: "gentle",
  };
}

export function safeComebackFallback(): ComebackResult {
  return { reply: "这句反击很有精神，证据还在路上，我们轻松接招。", wit: 76, force: 58, stubbornness: 64, support: 86 };
}

export function safeReportFallback(): ReportResult {
  return {
    comedyTags: ["气氛担当", "细节雷达", "精准收尾"],
    metrics: { atmosphere: 82, stubbornness: 61, casualCredibility: 35 },
    award: { title: "年度轻松表达奖", citation: "颁给愿意用幽默记录日常的你。" },
    bestJoke: "你的随便不是没有答案，是答案还在候场。",
    fictionalDisclaimer: "以下标签、奖项与指标均为喜剧化虚构，不是真实心理或能力测量。",
  };
}
