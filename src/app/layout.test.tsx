import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("offers a skip link before the shared site chrome", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">节目内容</main>
      </RootLayout>,
    );
    expect(markup).toContain('class="skip-link"');
    expect(markup).toContain('href="#main-content"');
    expect(markup.indexOf("skip-link")).toBeLessThan(markup.indexOf("site-header"));
  });
});
