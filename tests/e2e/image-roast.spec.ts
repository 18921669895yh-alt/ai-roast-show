import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = path.resolve("tests/fixtures/tiny.png");

test("valid generated PNG previews and completes a mock image roast", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/roast");
  await page.getByLabel("上传照片").setInputFiles(fixture);
  await expect(page.getByRole("img", { name: "已上传照片预览" })).toBeVisible();
  await page.getByRole("button", { name: "开始吐槽" }).click();
  await expect(page.getByRole("heading", { name: "右侧先听这几句" })).toBeVisible();
  await page.getByRole("button", { name: "查看完整吐槽" }).click();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByRole("heading", { name: "今晚最好笑的一句" })).toBeVisible();
});

test("invalid type and oversized image are rejected on the client", async ({ page }) => {
  await page.goto("/roast");
  const input = page.getByLabel("上传照片");
  await input.setInputFiles({ name: "not-image.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  await expect(page.locator(".roast-uploader .field-error")).toContainText("仅支持 JPG、PNG 或 WEBP");

  await input.setInputFiles({ name: "too-large.png", mimeType: "image/png", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(page.locator(".roast-uploader .field-error")).toContainText("照片不能超过 10MB");
});
