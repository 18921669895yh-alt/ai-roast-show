import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import SafetyNotice from "./SafetyNotice";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>查看原则</button>
      <SafetyNotice open={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe("SafetyNotice", () => {
  it("is named, explains storage and safety boundaries, and traps focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "查看原则" }));

    const dialog = screen.getByRole("dialog", { name: "隐私与内容原则" });
    expect(dialog).toBeVisible();
    expect(screen.getByText(/服务器不会存储你的照片/)).toBeVisible();
    expect(screen.getByText(/不做心理诊断/)).toBeVisible();
    expect(screen.getByRole("button", { name: "关闭隐私与内容原则" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "我知道了" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "关闭隐私与内容原则" })).toHaveFocus();
  });

  it("closes on Escape and restores focus to the opener", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "查看原则" });
    await user.click(opener);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("wraps focus in reverse and redirects programmatic outside focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "查看原则" });
    await user.click(opener);
    const close = screen.getByRole("button", { name: "关闭隐私与内容原则" });
    const confirm = screen.getByRole("button", { name: "我知道了" });

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();

    opener.focus();
    expect(close).toHaveFocus();
  });

  it("closes from the backdrop and restores the previous body overflow", async () => {
    const user = userEvent.setup();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "clip";
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "查看原则" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "隐私与内容原则" });

    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(opener).toHaveFocus();
    document.body.style.overflow = previousOverflow;
  });

  it("preserves the original opener across rerenders while open", async () => {
    const user = userEvent.setup();
    const firstClose = () => undefined;
    const view = render(
      <>
        <button>原始按钮</button>
        <SafetyNotice open={false} onClose={firstClose} />
      </>,
    );
    const opener = screen.getByRole("button", { name: "原始按钮" });
    opener.focus();
    view.rerender(
      <>
        <button>原始按钮</button>
        <SafetyNotice open onClose={firstClose} />
      </>,
    );
    view.rerender(
      <>
        <button>原始按钮</button>
        <SafetyNotice open onClose={() => view.rerender(<><button>原始按钮</button><SafetyNotice open={false} onClose={firstClose} /></>)} />
      </>,
    );

    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
  });
});
