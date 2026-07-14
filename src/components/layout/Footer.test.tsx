import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import Footer from "./Footer";

describe("Footer", () => {
  it("shows the required program disclaimer and links", () => {
    render(<Footer />);
    expect(screen.getByText("本节目不提供心理诊断，只提供轻微嘴硬。")).toBeVisible();
    expect(screen.getByRole("link", { name: "隐私说明" })).toHaveAttribute("href", "/#privacy");
    expect(screen.getByRole("link", { name: "意见反馈" })).toHaveAttribute("href", "mailto:feedback@airoast.local");
    expect(screen.getByRole("link", { name: "AI也要挨骂" })).toHaveAttribute("href", "/#about");
  });

  it("opens the content principles dialog", async () => {
    const user = userEvent.setup();
    render(<Footer />);
    await user.click(screen.getByRole("button", { name: "内容原则" }));
    expect(screen.getByRole("dialog", { name: "隐私与内容原则" })).toBeVisible();
  });

  it("focuses the local privacy destination from its unchanged hash link", async () => {
    const user = userEvent.setup();
    render(<><main id="privacy" tabIndex={-1}>本页隐私说明</main><Footer /></>);

    await user.click(screen.getByRole("link", { name: "隐私说明" }));

    expect(screen.getByText("本页隐私说明")).toHaveFocus();
  });
});
