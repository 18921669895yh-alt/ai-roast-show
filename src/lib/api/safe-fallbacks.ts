import type { ComebackResult, ReportResult } from "@/lib/ai/provider";
import type { RoastResult } from "@/lib/domain/roast";

export function safeRoastFallback(): RoastResult {
  return {
    opening: "这条朋友圈把普通日常剪出了年度预告片的劲头。",
    observations: [
      { title: "滤镜开太大", body: "普通场景被写得像品牌纪录片，连空气都得配旁白。", tag: "强行高级" },
      { title: "文案太满", body: "一句能说完的事，硬塞进了三层人生感悟。", tag: "用力过猛" },
      { title: "日常变史诗", body: "它不是没有内容，是每个细节都想抢主角。", tag: "自我感动" },
    ],
    bestJoke: "这条朋友圈最大的松弛感，是它完全不知道自己已经在用力。",
    reverseCompliment: "至少它的自信很完整，完整到细节都插不进话。",
    comedyTags: ["强行高级", "文案太满", "日常史诗"],
    metrics: { atmosphere: 82, stubbornness: 61, casualCredibility: 35 },
    award: { title: "年度日常史诗奖", citation: "颁给能把普通瞬间写成预告片的这条内容。" },
    safetyMode: "gentle",
  };
}

export function safeComebackFallback(): ComebackResult {
  return { reply: "这句反击很有精神，证据还在路上，我们轻松接招。", wit: 76, force: 58, stubbornness: 64, support: 86 };
}

export function safeReportFallback(): ReportResult {
  return {
    comedyTags: ["强行高级", "文案太满", "日常史诗"],
    metrics: { atmosphere: 82, stubbornness: 61, casualCredibility: 35 },
    award: { title: "年度日常史诗奖", citation: "颁给能把普通瞬间写成预告片的这条内容。" },
    bestJoke: "这条朋友圈最大的松弛感，是它完全不知道自己已经在用力。",
    fictionalDisclaimer: "以下标签、奖项与指标均为喜剧化虚构，不是真实心理或能力测量。",
  };
}
