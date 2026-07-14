import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoadingComedyStage, { LOADING_MESSAGES } from "./LoadingComedyStage";

describe("LoadingComedyStage", () => {
  afterEach(() => vi.useRealTimers());

  it("rotates messages every 1.4 seconds and cancels", async () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    render(<LoadingComedyStage onCancel={onCancel} />);
    expect(screen.getByRole("status")).toHaveTextContent(LOADING_MESSAGES[0]);
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByRole("status")).toHaveTextContent(LOADING_MESSAGES[1]);
    screen.getByRole("button", { name: "取消生成" }).click();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("stays on the first message under reduced motion", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<LoadingComedyStage onCancel={vi.fn()} />);
    act(() => vi.advanceTimersByTime(5600));
    expect(screen.getByRole("status")).toHaveTextContent(LOADING_MESSAGES[0]);
  });
});
