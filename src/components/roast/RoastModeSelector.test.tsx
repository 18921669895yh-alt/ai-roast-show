import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RoastModeSelector from "./RoastModeSelector";

describe("RoastModeSelector", () => {
  it("renders all modes as native radios and changes selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastModeSelector value="photo" onChange={onChange} />);
    for (const label of ["锐评他的照片", "锐评他的穿搭", "锐评他的朋友圈", "锐评他的聊天风格", "锐评他的自我介绍", "随机开麦"]) {
      expect(screen.getByRole("radio", { name: label })).toBeVisible();
    }
    await user.click(screen.getByRole("radio", { name: "锐评他的朋友圈" }));
    expect(onChange).toHaveBeenCalledWith("moments");
  });
});
