import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the exact hero copy, links, sample roast, and metrics", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: "交出那条朋友圈，让 AI 拆它两句" })).toBeVisible();
    expect(screen.getByText("把别人那条装腔作势的朋友圈交上来。我们不骂人，只把文案里的用力过猛逐句拆开。")).toBeVisible();
    expect(screen.getByRole("link", { name: "交出素材，开始锐评" })).toHaveAttribute("href", "/roast");
    expect(screen.getByRole("link", { name: "看看锐评怎么拆" })).toHaveAttribute("href", "#steps");
    expect(screen.getByText("这位朋友的穿搭很像AI生成的——每个单品都没错，组合在一起就是错了。")).toBeVisible();
    expect(screen.getByText("87%")).toBeVisible();
    expect(screen.getByText("76%")).toBeVisible();
    expect(screen.getByText("94%")).toBeVisible();
  });

  it("moves focus to the ticket flow from the secondary hero link", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("link", { name: "看看锐评怎么拆" }));

    expect(screen.getByRole("region", { name: "三步拆穿一条朋友圈" })).toHaveFocus();
  });

  it("renders the three-step ticket flow", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "三步拆穿一条朋友圈" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "交出那条朋友圈" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "选择锐评火力" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "领取三段式锐评" })).toBeVisible();
  });

  it("renders the bottom CTA and privacy reassurance", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "把那条朋友圈交出来。" })).toBeVisible();
    expect(screen.getByText("你负责提供内容，AI负责把文案里的小心机、滤镜和史诗感逐句拆开。")).toBeVisible();
    expect(screen.getByRole("link", { name: "开始锐评" })).toHaveAttribute("href", "/roast");
    expect(screen.getByText("🔒 素材仅用于本次生成，不会公开展示；你随时可以退出。")).toBeVisible();
    expect(document.getElementById("about")).toHaveAttribute("tabindex", "-1");
    expect(document.getElementById("privacy")).toHaveAttribute("tabindex", "-1");
  });
});
