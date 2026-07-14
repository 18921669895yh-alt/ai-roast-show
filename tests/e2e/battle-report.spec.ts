import { expect, test } from "@playwright/test";

async function enterBattle(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/roast");
  await page.getByLabel("文字素材").fill("我嘴上说随便，最后总会补充意见。 ");
  await page.getByRole("button", { name: "开始吐槽" }).click();
  await expect(page.getByRole("heading", { name: "右侧先听这几句" })).toBeVisible();
  await page.getByRole("button", { name: "查看完整吐槽" }).click();
  await expect(page).toHaveURL(/\/result$/);
  await page.getByRole("link", { name: "申请反击" }).click();
  await expect(page).toHaveURL(/\/battle$/);
}

async function finishBattle(page: import("@playwright/test").Page) {
  for (let round = 1; round <= 5; round += 1) {
    await page.getByRole("button", { name: "这也叫脱口秀？" }).click();
    await expect(page.getByRole("heading", { name: round === 5 ? "对决结束" : `ROUND ${round + 1}` })).toBeVisible();
  }
}

test("result seed completes five mock rounds and the actual final report link navigates", async ({ page }) => {
  await enterBattle(page);
  await finishBattle(page);
  await expect(page.getByRole("heading", { name: /用户获胜|AI险胜|双方嘴都很硬|本场无人认输/ })).toBeFocused();
  const reportLink = page.getByRole("link", { name: "领取吐槽报告" });
  await expect(reportLink).toHaveAttribute("href", "/report");
  await reportLink.click();
  await expect(page).toHaveURL(/\/report$/);
  await expect(page.getByRole("heading", { name: "AI吐槽大会：关于你的非正式喜剧观察报告" })).toBeVisible();
});

test("finished battle can reset to a clean first round", async ({ page }) => {
  await enterBattle(page);
  await finishBattle(page);
  await page.getByRole("button", { name: "再来一局" }).click();
  await expect(page.getByRole("heading", { name: "ROUND 1" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "来，回我一句" })).toBeEnabled();
});
