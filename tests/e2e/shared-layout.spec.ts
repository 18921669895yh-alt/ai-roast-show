import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile shared shell keeps navigation focus safe and avoids overflow", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "打开导航菜单" });

  await toggle.click();
  await page.getByRole("link", { name: "关于节目" }).click();
  await expect(page).toHaveURL(/\/#about$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#about")).toBeFocused();
  await expect(page.getByRole("link", { name: "跳到主要内容" })).toHaveAttribute("href", "#main-content");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("keyboard skip link and Easter-egg dialog restore focus", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "跳到主要内容" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  const logo = page.locator("header").getByRole("link", { name: "AI吐槽大会" });
  for (let click = 0; click < 5; click += 1) await logo.click();
  await expect(page.getByRole("dialog", { name: "AI自我吐槽大会" })).toBeVisible();
  await expect(page.getByRole("button", { name: "关闭AI自我吐槽大会" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(logo).toBeFocused();
});
