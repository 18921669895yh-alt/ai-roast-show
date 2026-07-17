import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RoastModeSelector from "./RoastModeSelector";

describe("RoastModeSelector", () => {
  it("renders all modes as native radios and changes selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastModeSelector value="photo" onChange={onChange} />);
    for (const label of ["锐评这张照片", "锐评这身穿搭", "锐评这条朋友圈", "锐评这段聊天", "锐评这份自我介绍", "随机开麦"]) {
      expect(screen.getByRole("radio", { name: label })).toBeVisible();
    }
    await user.click(screen.getByRole("radio", { name: "锐评这条朋友圈" }));
    expect(onChange).toHaveBeenCalledWith("moments");
  });
});
