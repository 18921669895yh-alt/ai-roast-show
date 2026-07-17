import type { RoastResult } from "@/lib/domain/roast";
import type { Provider, ReportResult } from "./provider";

function roastResult(safetyMode: "standard" | "gentle"): RoastResult {
  return {
    opening: safetyMode === "gentle" ? "这条内容只轻轻拆一下它藏不住的用力。" : "这条朋友圈把普通日常写出了招商片的饱满感。",
    observations: [
      { title: "滤镜总导演", body: "文案把普通日常调成了人生纪录片，连标点都在申请出镜。", tag: "强行高级" },
      { title: "感悟加班", body: "一句日常记录后面，硬跟着三层意义，像怕生活没有绩效。", tag: "鸡汤过量" },
      { title: "史诗预告片", body: "信息量不多，气势倒像已经拍到第三季大结局。", tag: "人设加码" },
    ],
    bestJoke: "这条朋友圈不是在记录生活，是在给生活做路演，连午饭都得先过一轮融资。",
    reverseCompliment: "好在它的表达欲很稳定，稳定地不肯给事实留位置。",
    comedyTags: ["强行高级", "鸡汤过量", "日常路演"],
    metrics: { atmosphere: 86, stubbornness: 68, casualCredibility: 24 },
    award: { title: "年度日常路演奖", citation: "颁给能让普通日常自带融资感的这条内容。" },
    safetyMode,
  };
}

const mockReport: ReportResult = {
  comedyTags: ["强行高级", "鸡汤过量", "日常路演"],
  metrics: { atmosphere: 86, stubbornness: 68, casualCredibility: 24 },
  award: { title: "年度日常路演奖", citation: "颁给能让普通日常自带融资感的这条内容。" },
  bestJoke: "这条朋友圈不是在记录生活，是在给生活做路演，连午饭都得先过一轮融资。",
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
