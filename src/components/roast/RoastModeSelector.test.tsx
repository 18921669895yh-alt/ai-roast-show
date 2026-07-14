import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RoastModeSelector from "./RoastModeSelector";

describe("RoastModeSelector", () => {
  it("renders all modes as native radios and changes selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastModeSelector value="photo" onChange={onChange} />);
    for (const label of ["吐槽我的照片", "吐槽我的穿搭", "吐槽我的朋友圈", "吐槽我的聊天风格", "吐槽我的自我介绍", "随机开麦"]) {
      expect(screen.getByRole("radio", { name: label })).toBeVisible();
    }
    await user.click(screen.getByRole("radio", { name: "吐槽我的朋友圈" }));
    expect(onChange).toHaveBeenCalledWith("moments");
  });
});
