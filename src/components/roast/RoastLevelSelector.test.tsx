import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import RoastLevelSelector from "./RoastLevelSelector";

describe("RoastLevelSelector", () => {
  it("presents real radios and defaults to the controlled familiar value", () => {
    render(<RoastLevelSelector value="familiar" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /轻轻带过/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /熟人拆台/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /爆辣锐评/ })).not.toBeChecked();
    expect(screen.getByText("30")).toBeVisible();
    expect(screen.getByText("65")).toBeVisible();
    expect(screen.getByText("90")).toBeVisible();
    expect(screen.getByText("点到为止，像熟人递来一记小小的白眼。")).toBeVisible();
    expect(screen.getByText("中辣开麦，专拆朋友圈里的小心机。")).toBeVisible();
    expect(screen.getByText("火力全开，把普通日常拆成大型人设事故。")).toBeVisible();
  });

  it("changes gentle and familiar levels immediately", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastLevelSelector value="familiar" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: /轻轻带过/ }));
    expect(onChange).toHaveBeenCalledWith("gentle");
  });

  it("changes to the stage level immediately without a confirmation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastLevelSelector value="familiar" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: /爆辣锐评/ }));
    expect(onChange).toHaveBeenCalledWith("stage");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the previous level when extreme confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastLevelSelector value="familiar" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: /极其恶毒/ }));
    expect(screen.getByRole("dialog", { name: "确认开启极其恶毒" })).toBeVisible();
    expect(screen.getByText("这一档会把朋友圈里的用力过猛逐句拆开。确认后火力将调到 100%。")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "算了，收点火" }));

    expect(screen.getByRole("radio", { name: /熟人拆台/ })).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("changes to extreme only after confirmation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastLevelSelector value="familiar" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: /极其恶毒/ }));
    await user.click(screen.getByRole("button", { name: "确认，放大火力" }));

    expect(onChange).toHaveBeenCalledWith("extreme");
  });

  it("traps focus in both directions inside the extreme confirmation", async () => {
    const user = userEvent.setup();
    render(<RoastLevelSelector value="familiar" onChange={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: /极其恶毒/ }));
    const cancel = screen.getByRole("button", { name: "算了，收点火" });
    const confirm = screen.getByRole("button", { name: "确认，放大火力" });

    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
  });

  it("returns programmatic outside focus to the open extreme confirmation", async () => {
    const user = userEvent.setup();
    render(<><button type="button">页面外控制</button><RoastLevelSelector value="familiar" onChange={vi.fn()} /></>);
    const outside = screen.getByRole("button", { name: "页面外控制" });

    await user.click(screen.getByRole("radio", { name: /极其恶毒/ }));
    outside.focus();

    expect(screen.getByRole("button", { name: "算了，收点火" })).toHaveFocus();
  });

  it("restores focus to the extreme radio after confirmation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastLevelSelector value="familiar" onChange={onChange} />);
    const extreme = screen.getByRole("radio", { name: /极其恶毒/ });

    await user.click(extreme);
    await user.click(screen.getByRole("button", { name: "确认，放大火力" }));

    expect(onChange).toHaveBeenCalledWith("extreme");
    await waitFor(() => expect(extreme).toHaveFocus());
  });

  it("cancels on Escape and restores focus to the extreme radio", async () => {
    const user = userEvent.setup();
    render(<RoastLevelSelector value="familiar" onChange={vi.fn()} />);
    const extreme = screen.getByRole("radio", { name: /极其恶毒/ });

    await user.click(extreme);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "确认开启极其恶毒" })).not.toBeInTheDocument();
    await waitFor(() => expect(extreme).toHaveFocus());
  });

  it("locks scrolling and isolates background while extreme confirmation is open", async () => {
    const user = userEvent.setup();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "clip";
    render(<><button type="button">浓度外控制</button><RoastLevelSelector value="familiar" onChange={vi.fn()} /></>);
    const outside = screen.getByRole("button", { name: "浓度外控制" });

    await user.click(screen.getByRole("radio", { name: /极其恶毒/ }));
    expect(document.body.style.overflow).toBe("hidden");
    expect(outside).toHaveAttribute("aria-hidden", "true");
    expect(outside).toHaveAttribute("inert");

    await user.click(screen.getByRole("button", { name: "算了，收点火" }));
    expect(document.body.style.overflow).toBe("clip");
    expect(outside).not.toHaveAttribute("aria-hidden");
    expect(outside).not.toHaveAttribute("inert");
    document.body.style.overflow = previousOverflow;
  });
});
