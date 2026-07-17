import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the exact hero copy, links, sample roast, and metrics", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: "来都来了，让 AI 说你两句" })).toBeVisible();
    expect(screen.getByText("把别人那条装腔作势的朋友圈交上来。我们不骂人，只把文案里的用力过猛逐句拆开。")).toBeVisible();
    expect(screen.getByRole("link", { name: "上传照片，开始吐槽" })).toHaveAttribute("href", "/roast");
    expect(screen.getByRole("link", { name: "先看看别人怎么被吐槽" })).toHaveAttribute("href", "#audience");
    expect(screen.getByText("这位朋友的穿搭很像AI生成的——每个单品都没错，组合在一起就是错了。")).toBeVisible();
    expect(screen.getByText("87分贝")).toBeVisible();
    expect(screen.getByText("76%")).toBeVisible();
    expect(screen.getByText("94%")).toBeVisible();
  });

  it("moves focus to the audience section from the secondary hero link", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("link", { name: "先看看别人怎么被吐槽" }));

    expect(screen.getByRole("region", { name: "今日观众席" })).toHaveFocus();
  });

  it("shows all four audience examples and keyboard-readable reactions", async () => {
    const user = userEvent.setup();
    render(<Home />);

    for (const category of ["穿搭", "朋友圈", "自拍", "职场"]) {
      expect(screen.getByRole("article", { name: `${category}吐槽` })).toBeVisible();
    }
    expect(screen.getByText("你的穿搭透露出一种明确的态度：衣柜里的每件衣服都有自己的梦想，但没有一件愿意配合团队。")).toBeVisible();
    expect(screen.getByText("你的朋友圈文案平均每句话有2.3个Emoji，建议尽快申请《公共表情符号使用许可证》。")).toBeVisible();
    expect(screen.getByText("这个自拍表情非常微妙。既想表现得毫不在意，又怕大家真的没注意。")).toBeVisible();
    expect(screen.getByText("你在群里回复‘收到’的速度，像一个情绪稳定、内心已经离职三遍的人。")).toBeVisible();

    const firstReaction = screen.getAllByRole("button", { name: "笑声 +1" })[0];
    expect(firstReaction).toHaveStyle({ minHeight: "44px" });
    await user.tab();
    firstReaction.focus();
    expect(firstReaction).toHaveFocus();
    expect(screen.getAllByRole("button", { name: "扎心了" })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "本人已离场" })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "申请重赛" })).toHaveLength(4);
  });

  it("renders the three-step ticket flow", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "三步登台" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "上传照片或文字素材" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "选择吐槽浓度" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "领取你的吐槽报告" })).toBeVisible();
  });

  it("renders the bottom CTA and privacy reassurance", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "准备好了吗？" })).toBeVisible();
    expect(screen.getByText("你负责提供素材，AI负责发现那些你自己一直假装没注意到的细节。")).toBeVisible();
    expect(screen.getByRole("link", { name: "好的，开始说我" })).toHaveAttribute("href", "/roast");
    expect(screen.getByText("🔒 照片仅用于本次生成，不会进入公开观众席；你随时可以退出。")).toBeVisible();
    expect(document.getElementById("about")).toHaveAttribute("tabindex", "-1");
    expect(document.getElementById("privacy")).toHaveAttribute("tabindex", "-1");
  });
});
