import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import AudienceReactionBar from "./AudienceReactionBar";
import { BATTLE_SEED_STORAGE_KEY } from "@/lib/domain/battle-seed";

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.useRealTimers());

describe("AudienceReactionBar", () => {
  it("keeps reaction counts in component state and floats laughter feedback", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    render(<AudienceReactionBar />);

    const laugh = screen.getByRole("button", { name: /哈哈哈/ });
    fireEvent.click(laugh);
    fireEvent.click(laugh);

    expect(laugh).toHaveTextContent("2");
    expect(screen.getByText("哈哈哈", { selector: ".reaction-float" })).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.queryByText("哈哈哈", { selector: ".reaction-float" })).not.toBeInTheDocument();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses a real two-step 不服 flow, seeds only on second activation, then navigates", () => {
    vi.useFakeTimers();
    const submit = vi.fn((event: Event) => event.preventDefault());
    const navigate = vi.fn();
    render(<form onSubmit={submit}><AudienceReactionBar battleSeed="最佳句" onNavigate={navigate} /></form>);

    const protest = screen.getByRole("link", { name: /不服/ });
    fireEvent.click(protest);
    expect(protest).toHaveTextContent("1");
    expect(screen.getByRole("status")).toHaveTextContent("再点一次就开打。");
    expect(sessionStorage.getItem(BATTLE_SEED_STORAGE_KEY)).toBeNull();
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(protest);
    expect(protest).toHaveTextContent("2");
    expect(screen.getByRole("status")).toHaveTextContent("系统检测到高浓度嘴硬反应。");
    expect(protest).toHaveClass("is-protesting");
    expect(sessionStorage.getItem(BATTLE_SEED_STORAGE_KEY)).toBe(JSON.stringify({ version: 1, bestJoke: "最佳句" }));
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(700));
    expect(navigate).toHaveBeenCalledWith("/battle");
    expect(submit).not.toHaveBeenCalled();
  });

  it("resets the two-step threshold after the prompt window", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<AudienceReactionBar battleSeed="最佳句" onNavigate={navigate} />);
    const protest = screen.getByRole("link", { name: /不服/ });
    fireEvent.click(protest);
    act(() => vi.advanceTimersByTime(2_500));
    fireEvent.click(protest);
    expect(screen.getByRole("status")).toHaveTextContent("再点一次就开打。");
    expect(sessionStorage.getItem(BATTLE_SEED_STORAGE_KEY)).toBeNull();
    act(() => vi.advanceTimersByTime(700));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("cancels delayed battle navigation on unmount", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const view = render(<AudienceReactionBar battleSeed="最佳句" onNavigate={navigate} />);
    const protest = screen.getByRole("link", { name: /不服/ });
    fireEvent.click(protest);
    fireEvent.click(protest);
    view.unmount();
    act(() => vi.advanceTimersByTime(1_000));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("supports the two-step flow from the keyboard", async () => {
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<AudienceReactionBar battleSeed="最佳句" onNavigate={navigate} />);
    const protest = screen.getByRole("link", { name: /不服/ });
    protest.focus();
    await user.keyboard("{Enter}{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("系统检测到高浓度嘴硬反应。");
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/battle"));
  });

  it("offers battle links and inert native reaction buttons", () => {
    render(<AudienceReactionBar />);

    expect(screen.getByRole("link", { name: /不服/ })).toHaveAttribute("href", "/battle");
    expect(screen.getByRole("link", { name: "申请反击" })).toHaveAttribute("href", "/battle");
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("type", "button");
    }
  });

  it("clears the red protest state after a brief beat", () => {
    vi.useFakeTimers();
    render(<AudienceReactionBar onNavigate={vi.fn()} />);
    const protest = screen.getByRole("link", { name: /不服/ });

    fireEvent.click(protest);
    fireEvent.click(protest);
    expect(protest).toHaveClass("is-protesting");
    act(() => vi.advanceTimersByTime(1_000));
    expect(protest).not.toHaveClass("is-protesting");
    vi.useRealTimers();
  });

  it("keeps the exact protest message available during the navigation delay", () => {
    vi.useFakeTimers();
    render(<AudienceReactionBar battleSeed="最佳句" onNavigate={vi.fn()} />);
    const protest = screen.getByRole("link", { name: /不服/ });
    fireEvent.click(protest);
    fireEvent.click(protest);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("status")).toHaveTextContent("系统检测到高浓度嘴硬反应。");
    act(() => vi.advanceTimersByTime(1_800));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    vi.useRealTimers();
  });

  it("exposes the reaction controls as a named group", () => {
    render(<AudienceReactionBar />);
    expect(screen.getByRole("group", { name: "观众反应" })).toBeInTheDocument();
  });
});
