import { expect, type Locator, type Page, test } from "@playwright/test";

test.use({ viewport: { width: 320, height: 720 } });

async function expectInsideViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
}

async function expectMobileLayout(page: Page, controls: Locator[]) {
  await expect(page.locator("main#main-content[tabindex='-1']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  for (const control of controls) await expectInsideViewport(control);
}

test("home and roast entry controls fit a 320px viewport", async ({ page }) => {
  await page.goto("/");
  await expectMobileLayout(page, [
    page.getByRole("link", { name: "上传照片，开始吐槽" }),
    page.getByRole("link", { name: "先看看别人怎么被吐槽" }),
  ]);

  await page.goto("/roast");
  await expectMobileLayout(page, [
    page.getByLabel("文字素材"),
    page.getByRole("button", { name: "开始吐槽" }),
  ]);
});

test("populated result, battle, report, and share dialog fit a 320px viewport", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/roast");
  await page.getByLabel("文字素材").fill("我嘴上说随便，最后总会认真补充三个意见。");
  await page.getByRole("button", { name: "开始吐槽" }).click();

  const fullResultButton = page.getByRole("button", { name: "查看完整吐槽" });
  await expectMobileLayout(page, [
    page.getByRole("heading", { name: "右侧先听这几句" }),
    fullResultButton,
  ]);
  await fullResultButton.click();

  await expect(page).toHaveURL(/\/result$/);
  await expectMobileLayout(page, [
    page.getByRole("heading", { name: "今晚最好笑的一句" }),
    page.getByRole("link", { name: "申请反击" }),
    page.getByRole("link", { name: "领取吐槽报告" }),
  ]);

  await page.getByRole("link", { name: "领取吐槽报告" }).click();
  await expect(page).toHaveURL(/\/report$/);
  const shareButton = page.getByRole("button", { name: "生成分享卡" });
  await expectMobileLayout(page, [
    page.getByRole("heading", { name: "AI吐槽大会：关于你的非正式喜剧观察报告" }),
    shareButton,
  ]);

  await shareButton.click();
  const dialog = page.getByRole("dialog", { name: "分享卡片预览" });
  await expectMobileLayout(page, [
    dialog,
    dialog.getByRole("button", { name: "下载 PNG" }),
    page.getByRole("button", { name: "关闭分享卡片预览" }),
  ]);
  await page.getByRole("button", { name: "关闭分享卡片预览" }).click();

  await page.goto("/result");
  await page.getByRole("link", { name: "申请反击" }).click();
  await expect(page).toHaveURL(/\/battle$/);
  await expectMobileLayout(page, [
    page.getByRole("heading", { name: "ROUND 1" }),
    page.getByRole("textbox", { name: "来，回我一句" }),
    page.getByRole("button", { name: "送出反击" }),
  ]);
});

test("reduced motion disables continuous stage animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.locator(".spotlight").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});
