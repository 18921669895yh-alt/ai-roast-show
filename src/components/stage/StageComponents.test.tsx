import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RetroTvFrame from "./RetroTvFrame";
import SpotlightBackground from "./SpotlightBackground";

describe("stage decoration", () => {
  it("keeps decorative layers out of the accessibility tree", () => {
    const { container } = render(<SpotlightBackground />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps TV decoration hidden while preserving semantic content", () => {
    render(
      <RetroTvFrame ariaLabel="今晚节目">
        <h2>真正的节目内容</h2>
      </RetroTvFrame>,
    );
    expect(screen.getByRole("region", { name: "今晚节目" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "真正的节目内容" })).toBeVisible();
    expect(document.querySelector("[data-tv-decoration]")).toHaveAttribute("aria-hidden", "true");
  });
});
