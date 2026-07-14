import type { RoastResult } from "@/lib/domain/roast";
import type { Provider, ReportResult } from "./provider";

function roastResult(safetyMode: "standard" | "gentle"): RoastResult {
  return {
    opening: safetyMode === "gentle" ? "今晚轻轻开麦，笑点只碰你主动分享的小习惯。" : "各位观众，掌声欢迎这位把“随便”说得很有主见的选手。",
    observations: [
      { title: "随便总指挥", body: "嘴上把选择权交出去，意见却总能在最后一秒准时到场。", tag: "延迟决策" },
      { title: "气氛质检员", body: "每句“都可以”后面，都藏着一套尚未公开的评分表。", tag: "标准在线" },
      { title: "压轴发言人", body: "等大家讨论完再补一句建议，主打一个高效复盘。", tag: "精准收尾" },
    ],
    bestJoke: "你的“随便”不是没有答案，是答案还在候场。",
    reverseCompliment: "认真说，你很在意大家的体验，也很会观察细节。",
    comedyTags: ["气氛担当", "后发制人", "细节雷达"],
    metrics: { atmosphere: 86, stubbornness: 68, casualCredibility: 24 },
    award: { title: "年度精致随意奖", citation: "颁给每次说随便，却总能让方案变得更周全的你。" },
    safetyMode,
  };
}

const mockReport: ReportResult = {
  comedyTags: ["气氛担当", "后发制人", "细节雷达"],
  metrics: { atmosphere: 86, stubbornness: 68, casualCredibility: 24 },
  award: { title: "年度精致随意奖", citation: "颁给总能让方案变得更周全的你。" },
  bestJoke: "你的“随便”不是没有答案，是答案还在候场。",
  fictionalDisclaimer: "以下标签、奖项与指标均为喜剧化虚构，不是真实心理或能力测量。",
};

export const mockProvider: Provider = {
  async roast(input) { return roastResult(input.safetyMode); },
  async comeback(input) {
    return { reply: `第${input.round}回合收到：你这句反击很有精神，证据还在路上。`, wit: 78, force: 66, stubbornness: 72, support: 81 };
  },
  async report() {
    return {
      ...mockReport,
      comedyTags: [...mockReport.comedyTags],
      metrics: { ...mockReport.metrics },
      award: { ...mockReport.award },
    };
  },
};
