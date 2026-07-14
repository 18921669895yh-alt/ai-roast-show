import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("text roast uses the real mock API through result, reactions, report, and share poster", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/roast");
  await page.getByRole("radio", { name: /吐槽我的聊天风格/ }).check();
  await page.getByRole("radio", { name: /轻轻调侃/ }).check();
  await page.getByLabel("文字素材").fill("我每次说随便，最后都会认真补充三个意见。 ");
  await page.getByRole("button", { name: "开始吐槽" }).click();
  await expect(page.getByRole("heading", { name: "右侧先听这几句" })).toBeVisible();
  await expect(page.getByText("今晚最好笑的一句")).toBeVisible();
  await page.getByRole("button", { name: "查看完整吐槽" }).click();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByRole("heading", { name: "今晚最好笑的一句" })).toBeVisible();
  await page.getByRole("button", { name: /哈哈哈 0/ }).click();
  await expect(page.getByRole("button", { name: /哈哈哈 1/ })).toBeVisible();
  await page.getByRole("link", { name: "领取吐槽报告" }).click();

  await expect(page).toHaveURL(/\/report$/);
  await expect(page.getByRole("heading", { name: "AI吐槽大会：关于你的非正式喜剧观察报告" })).toBeVisible();
  await page.getByRole("button", { name: "生成分享卡" }).click();
  const dialog = page.getByRole("dialog", { name: "分享卡片预览" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("AI吐槽大会")).toBeVisible();
  await expect(dialog.locator("img")).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "下载 PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);
  expect(download.suggestedFilename()).toBe("AI吐槽大会-分享卡.png");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const png = await readFile(downloadPath!);
  expect(png.length).toBeGreaterThan(24);
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(png.readUInt32BE(16)).toBeGreaterThan(0);
  expect(png.readUInt32BE(20)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "关闭分享卡片预览" }).click();

  await page.goto("/report?share=1");
  await expect(page.getByRole("dialog", { name: "分享卡片预览" })).toBeVisible();
});
