import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HeaderView } from "./Header";

describe("Header", () => {
  it("renders navigation for reviewing other people's Moments", () => {
    render(<HeaderView currentPath="/" />);

    expect(screen.getByRole("link", { name: "AI吐槽大会" })).toHaveAttribute("href", "/");
    expect(screen.getByText("专拆朋友圈里的用力过猛")).toBeVisible();
    expect(screen.getByRole("link", { name: "交出朋友圈" })).toHaveAttribute("href", "/roast");
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
  });

  it("opens and closes the mobile menu with keyboard-accessible controls", async () => {
    const user = userEvent.setup();
    render(<HeaderView currentPath="/" />);
    const toggle = screen.getByRole("button", { name: "打开导航菜单" });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "开始锐评" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("restores focus to the toggle when a mobile menu link closes the menu", async () => {
    const user = userEvent.setup();
    render(<HeaderView currentPath="/" />);
    const toggle = screen.getByRole("button", { name: "打开导航菜单" });

    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: "关于锐评" }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(toggle).toHaveFocus());
  });

  it("marks the current route without marking unrelated links", () => {
    render(<HeaderView currentPath="/roast" />);

    expect(screen.getByRole("link", { name: "开始锐评" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "首页" })).not.toHaveAttribute("aria-current");
  });

  it("focuses a local about target when its hash link is activated", async () => {
    const user = userEvent.setup();
    render(<><HeaderView currentPath="/" /><section id="about" tabIndex={-1}>关于锐评内容</section></>);

    await user.click(screen.getByRole("link", { name: "关于锐评" }));

    expect(screen.getByText("关于锐评内容")).toHaveFocus();
  });
});
