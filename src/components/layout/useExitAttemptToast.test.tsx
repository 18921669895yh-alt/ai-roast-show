import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useExitAttemptToast } from "./useExitAttemptToast";

function Harness({ active, onNavigate }: { active: boolean; onNavigate: () => void }) {
  const { exitMessage, exitClarification, dismissExitMessage } = useExitAttemptToast(active);
  return <><a href="/report" onClick={(event) => { event.preventDefault(); onNavigate(); }}>报告</a><a href="/battle" onClick={(event) => { event.preventDefault(); onNavigate(); }}>对决</a>{exitMessage ? <aside role="status"><strong>{exitMessage}</strong><span>{exitClarification}</span><button onClick={dismissExitMessage}>关闭</button></aside> : null}</>;
}

afterEach(() => vi.useRealTimers());

it("shows an exit toast before allowing active internal navigation", () => {
  vi.useFakeTimers();
  const onNavigate = vi.fn();
  render(<Harness active onNavigate={onNavigate} />);
  fireEvent.click(screen.getByRole("link", { name: "报告" }));
  expect(screen.getByRole("status")).toHaveTextContent("离场可以，但嘴硬数据已经保存。");
  expect(screen.getByRole("status")).toHaveTextContent("仅指已完成的文字结果；当前草稿和照片不会保存。");
  expect(onNavigate).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(450));
  expect(onNavigate).toHaveBeenCalledOnce();
});

it("cancels pending navigation when unmounted", () => {
  vi.useFakeTimers();
  const onNavigate = vi.fn();
  const view = render(<Harness active onNavigate={onNavigate} />);
  fireEvent.click(screen.getByRole("link", { name: "报告" }));
  view.unmount();
  act(() => vi.advanceTimersByTime(500));
  expect(onNavigate).not.toHaveBeenCalled();
});

it("replaces a pending destination with the latest internal link", () => {
  vi.useFakeTimers();
  const onNavigate = vi.fn();
  render(<Harness active onNavigate={onNavigate} />);
  fireEvent.click(screen.getByRole("link", { name: "报告" }));
  fireEvent.click(screen.getByRole("link", { name: "对决" }));
  act(() => vi.advanceTimersByTime(450));
  expect(onNavigate).toHaveBeenCalledOnce();
});

it("does not delay navigation when no roast or battle is active", () => {
  const onNavigate = vi.fn();
  render(<Harness active={false} onNavigate={onNavigate} />);
  fireEvent.click(screen.getByRole("link", { name: "报告" }));
  expect(onNavigate).toHaveBeenCalledOnce();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
