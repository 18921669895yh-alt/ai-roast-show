import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TextMaterialInput from "./TextMaterialInput";

describe("TextMaterialInput", () => {
  it("shows a live count and sparse message only after blur", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("");
      return <TextMaterialInput value={value} onChange={setValue} />;
    }
    render(<Harness />);
    const textarea = screen.getByPlaceholderText("例如：他发了一条朋友圈，文案像在给普通午饭写获奖感言……");
    await user.type(textarea, "太装了");
    expect(screen.getByText("3 / 500")).toBeVisible();
    expect(screen.queryByText("你提供的信息少得像工作群里的有效沟通。")).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText("你提供的信息少得像工作群里的有效沟通。")).toBeVisible();
  });

  it("limits typed text to 500 characters", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("");
      return <TextMaterialInput value={value} onChange={setValue} />;
    }
    render(<Harness />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "x".repeat(501));
    expect(textarea).toHaveValue("x".repeat(500));
    expect(screen.getByText("500 / 500")).toBeVisible();
  });
});
