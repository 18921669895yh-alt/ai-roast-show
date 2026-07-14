import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HeaderView } from "./Header";

describe("Header", () => {
  it("renders the show navigation and stage CTA", () => {
    render(<HeaderView currentPath="/" />);

    expect(screen.getByRole("link", { name: "AI吐槽大会" })).toHaveAttribute("href", "/");
    expect(screen.getByText("本节目可能造成轻微嘴硬")).toBeVisible();
    expect(screen.getByRole("link", { name: "上台挨两句" })).toHaveAttribute("href", "/roast");
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
  });

  it("opens and closes the mobile menu with keyboard-accessible controls", async () => {
    const user = userEvent.setup();
    render(<HeaderView currentPath="/" />);
    const toggle = screen.getByRole("button", { name: "打开导航菜单" });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "开始吐槽" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("restores focus to the toggle when a mobile menu link closes the menu", async () => {
    const user = userEvent.setup();
    render(<HeaderView currentPath="/" />);
    const toggle = screen.getByRole("button", { name: "打开导航菜单" });

    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: "关于节目" }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(toggle).toHaveFocus());
  });

  it("marks the current route without marking unrelated links", () => {
    render(<HeaderView currentPath="/roast" />);

    expect(screen.getByRole("link", { name: "开始吐槽" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "首页" })).not.toHaveAttribute("aria-current");
  });

  it("calls the logo Easter-egg callback after five activations", async () => {
    const user = userEvent.setup();
    const onLogoFiveClicks = vi.fn();
    render(<HeaderView currentPath="/" onLogoFiveClicks={onLogoFiveClicks} />);

    const logo = screen.getByRole("link", { name: "AI吐槽大会" });
    for (let click = 0; click < 5; click += 1) await user.click(logo);

    expect(onLogoFiveClicks).toHaveBeenCalledOnce();
  });

  it("opens an accessible self-roast dialog from five logo clicks", async () => {
    const user = userEvent.setup();
    render(<HeaderView currentPath="/" />);

    const logo = screen.getByRole("link", { name: "AI吐槽大会" });
    for (let click = 0; click < 5; click += 1) await user.click(logo);

    expect(screen.getByRole("dialog", { name: "AI自我吐槽大会" })).toBeVisible();
    expect(screen.getByText("我最大的特点，就是每次说‘简单来说’，后面还能再写800字。")).toBeVisible();
    expect(screen.getByRole("button", { name: "关闭AI自我吐槽大会" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "AI自我吐槽大会" })).not.toBeInTheDocument();
    await waitFor(() => expect(logo).toHaveFocus());
  });

  it("traps and redirects self-roast focus while locking and isolating the page", async () => {
    const user = userEvent.setup();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "clip";
    render(<><button type="button">页面外控制</button><HeaderView currentPath="/" /></>);
    const outside = screen.getByRole("button", { name: "页面外控制" });
    const logo = screen.getByRole("link", { name: "AI吐槽大会" });

    for (let click = 0; click < 5; click += 1) await user.click(logo);
    const close = screen.getByRole("button", { name: "关闭AI自我吐槽大会" });
    expect(document.body.style.overflow).toBe("hidden");
    expect(outside).toHaveAttribute("aria-hidden", "true");
    expect(outside).toHaveAttribute("inert");

    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    outside.focus();
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("clip");
    expect(outside).not.toHaveAttribute("aria-hidden");
    expect(outside).not.toHaveAttribute("inert");
    await waitFor(() => expect(logo).toHaveFocus());
    document.body.style.overflow = previousOverflow;
  });

  it("focuses a local about target when its hash link is activated", async () => {
    const user = userEvent.setup();
    render(<><HeaderView currentPath="/" /><section id="about" tabIndex={-1}>关于节目内容</section></>);

    await user.click(screen.getByRole("link", { name: "关于节目" }));

    expect(screen.getByText("关于节目内容")).toHaveFocus();
  });

  it("prevents the fifth logo activation from navigating on another route", () => {
    const onLogoFiveClicks = vi.fn();
    const view = render(<HeaderView currentPath="/" onLogoFiveClicks={onLogoFiveClicks} />);
    let logo = screen.getByRole("link", { name: "AI吐槽大会" });
    for (let click = 0; click < 4; click += 1) fireEvent.click(logo);
    view.rerender(<HeaderView currentPath="/roast" onLogoFiveClicks={onLogoFiveClicks} />);
    logo = screen.getByRole("link", { name: "AI吐槽大会" });

    expect(fireEvent.click(logo)).toBe(false);
    expect(onLogoFiveClicks).toHaveBeenCalledOnce();
  });

  it("delays one non-home logo activation, then navigates home", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<HeaderView currentPath="/roast" onHomeNavigate={navigate} />);
    expect(fireEvent.click(screen.getByRole("link", { name: "AI吐槽大会" }))).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1_100));
    expect(navigate).toHaveBeenCalledWith("/");
    vi.useRealTimers();
  });

  it("cancels delayed non-home navigation and opens self roast after five rapid activations", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<HeaderView currentPath="/report" onHomeNavigate={navigate} />);
    const logo = screen.getByRole("link", { name: "AI吐槽大会" });
    for (let click = 0; click < 5; click += 1) fireEvent.click(logo);
    expect(screen.getByRole("dialog", { name: "AI自我吐槽大会" })).toBeVisible();
    act(() => vi.advanceTimersByTime(1_500));
    expect(navigate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("resets the non-home logo click count after the navigation window", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<HeaderView currentPath="/battle" onHomeNavigate={navigate} />);
    const logo = screen.getByRole("link", { name: "AI吐槽大会" });
    fireEvent.click(logo);
    act(() => vi.advanceTimersByTime(1_100));
    for (let click = 0; click < 4; click += 1) fireEvent.click(logo);
    expect(screen.queryByRole("dialog", { name: "AI自我吐槽大会" })).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
