# AI 吐槽大会 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个复古电视台风格、支持 DeepSeek 文字吐槽与 Kimi 图片吐槽、包含即兴对决和可导出报告的完整 Next.js 网站。

**Architecture:** 使用 Next.js App Router，把页面组件、领域类型、模型适配器、安全规则和 API 路由分离。浏览器只保存结构化文字结果；服务端按“图片走 Kimi、纯文字优先 DeepSeek”的规则路由请求，并在无密钥或服务异常时安全降级到 Mock。

**Tech Stack:** Next.js、React、TypeScript、Tailwind CSS、Framer Motion、Lucide React、Zod、Vitest、Testing Library、Playwright、html-to-image。

---

## File map

- `package.json`：命令和依赖。
- `src/app/`：路由、全局样式与 API Route Handlers。
- `src/components/layout/`：Header、Footer、SafetyNotice。
- `src/components/stage/`：聚光灯、CRT 舞台、加载节目。
- `src/components/roast/`：上传、文字、浓度、结果与观众反应。
- `src/components/battle/`：对决输入、回合与计分。
- `src/components/report/`：指标、奖项、分享海报。
- `src/lib/ai/`：Provider 接口、DeepSeek、Kimi、Mock、路由与提示词。
- `src/lib/domain/`：Zod Schema、类型、本地存储与纯业务函数。
- `src/lib/safety/`：输入信号、安全提示和输出过滤。
- `src/lib/export/`：PNG 导出。
- `src/test/`：Vitest 初始化和公共测试工具。
- `tests/e2e/`：Playwright 关键流程。
- `public/generated/`：经过确认和压缩的生成式舞台装饰资产。

### Task 1: Scaffold the tested Next.js application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/test/setup.ts`
- Test: `src/app/page.test.tsx`

- [ ] **Step 1: Create the project manifest and test configuration**

```json
{
  "name": "ai-roast-show",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@ai-sdk/openai-compatible": "latest",
    "framer-motion": "latest",
    "html-to-image": "latest",
    "lucide-react": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "jsdom": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies and create the minimal App Router shell**

Run: `npm install`

Create `src/app/layout.tsx` with metadata, Chinese language, `globals.css`, and a body wrapping `children`. Create `src/app/page.tsx` returning `<main><h1>AI 吐槽大会</h1></main>`.

- [ ] **Step 3: Write the first smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

it("renders the show title", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: "AI 吐槽大会" })).toBeVisible();
});
```

- [ ] **Step 4: Run the test and build**

Run: `npm test -- src/app/page.test.tsx`
Expected: one passing test.

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 5: Commit**

Run: `git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts playwright.config.ts src && git commit -m "chore: scaffold AI roast show"`

### Task 2: Define domain schemas and browser persistence

**Files:**
- Create: `src/lib/domain/roast.ts`
- Create: `src/lib/domain/storage.ts`
- Test: `src/lib/domain/roast.test.ts`
- Test: `src/lib/domain/storage.test.ts`

- [ ] **Step 1: Write failing schema tests**

```ts
import { roastResultSchema } from "./roast";

it("accepts a complete roast result", () => {
  const result = roastResultSchema.parse({
    opening: "各位观众，欢迎下一位选手。",
    observations: [1, 2, 3].map((n) => ({ title: `观察${n}`, body: "基于素材的包袱。", tag: "精准打击" })),
    bestJoke: "本场最佳金句",
    reverseCompliment: "不过认真说，你很会表达。",
    comedyTags: ["氛围感", "嘴硬", "精心随意"],
    metrics: { atmosphere: 87, stubbornness: 92, casualCredibility: 14 },
    award: { title: "年度精心随意奖", citation: "颁给每次都说随便发发的你。" },
    safetyMode: "standard"
  });
  expect(result.observations).toHaveLength(3);
});

it("rejects fewer than three observations", () => {
  expect(() => roastResultSchema.parse({ observations: [] })).toThrow();
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/lib/domain/roast.test.ts`
Expected: FAIL because `roastResultSchema` does not exist.

- [ ] **Step 3: Implement schemas and exported types**

```ts
import { z } from "zod";

export const roastLevelSchema = z.enum(["gentle", "familiar", "stage"]);
export const roastModeSchema = z.enum(["photo", "outfit", "moments", "chat", "bio", "random"]);
export const roastResultSchema = z.object({
  opening: z.string().min(1),
  observations: z.array(z.object({ title: z.string(), body: z.string(), tag: z.string() })).min(3).max(5),
  bestJoke: z.string().min(1),
  reverseCompliment: z.string().min(1),
  comedyTags: z.array(z.string()).length(3),
  metrics: z.object({
    atmosphere: z.number().min(0).max(100),
    stubbornness: z.number().min(0).max(100),
    casualCredibility: z.number().min(0).max(100)
  }),
  award: z.object({ title: z.string(), citation: z.string() }),
  safetyMode: z.enum(["standard", "gentle"])
});

export type RoastResult = z.infer<typeof roastResultSchema>;
```

- [ ] **Step 4: Add persistence tests and implementation**

Test `saveLatestRoast`, `loadLatestRoast`, malformed JSON recovery, and verify that image/Data URL fields are never serialized. Implement storage under the key `ai-roast-show:latest` using `roastResultSchema.safeParse`.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/lib/domain`
Expected: all domain tests pass.

Run: `git add src/lib/domain && git commit -m "feat: define roast domain and persistence"`

### Task 3: Implement provider routing with DeepSeek, Kimi, and Mock

**Files:**
- Create: `src/lib/ai/provider.ts`
- Create: `src/lib/ai/deepseek.ts`
- Create: `src/lib/ai/kimi.ts`
- Create: `src/lib/ai/mock.ts`
- Create: `src/lib/ai/router.ts`
- Create: `src/lib/ai/prompts.ts`
- Test: `src/lib/ai/router.test.ts`

- [ ] **Step 1: Write failing routing tests**

```ts
import { routeRoast } from "./router";

it("routes images directly to Kimi", async () => {
  const deepseek = { roast: vi.fn() };
  const kimi = { roast: vi.fn().mockResolvedValue({ provider: "kimi" }) };
  await routeRoast({ text: "穿搭", image: { dataUrl: "data:image/png;base64,AA==", mimeType: "image/png" } }, { deepseek, kimi, mock: kimi });
  expect(kimi.roast).toHaveBeenCalledOnce();
  expect(deepseek.roast).not.toHaveBeenCalled();
});

it("falls back from DeepSeek to Kimi for text", async () => {
  const deepseek = { roast: vi.fn().mockRejectedValue(new Error("timeout")) };
  const kimi = { roast: vi.fn().mockResolvedValue({ provider: "kimi" }) };
  await routeRoast({ text: "朋友圈文案" }, { deepseek, kimi, mock: kimi });
  expect(kimi.roast).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/lib/ai/router.test.ts`
Expected: FAIL because the router is missing.

- [ ] **Step 3: Implement the provider interface and router**

```ts
export interface RoastProvider {
  roast(input: ProviderRoastInput): Promise<unknown>;
  comeback(input: ProviderComebackInput): Promise<unknown>;
  report(input: ProviderReportInput): Promise<unknown>;
}

export async function routeRoast(input: ProviderRoastInput, providers: ProviderSet) {
  if (process.env.AI_MOCK_MODE === "true") return providers.mock.roast(input);
  if (input.image) return providers.kimi.roast(input);
  try {
    return await providers.deepseek.roast(input);
  } catch {
    return providers.kimi.roast(input);
  }
}
```

- [ ] **Step 4: Implement OpenAI-compatible clients and Mock data**

Use server-only modules, environment-configured base URLs and model names, a 30-second abort timeout, and JSON response mode where supported. `mock.ts` must return a complete `RoastResult`, battle reply, and report so the full UI works without keys.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/lib/ai`
Expected: image routing, text priority, fallback, and forced Mock tests pass.

Run: `git add src/lib/ai && git commit -m "feat: add DeepSeek and Kimi provider routing"`

### Task 4: Add safety rules, validation, and API routes

**Files:**
- Create: `src/lib/safety/policy.ts`
- Create: `src/lib/safety/filter.ts`
- Create: `src/app/api/roast/route.ts`
- Create: `src/app/api/comeback/route.ts`
- Create: `src/app/api/report/route.ts`
- Test: `src/lib/safety/filter.test.ts`
- Test: `src/app/api/roast/route.test.ts`

- [ ] **Step 1: Write failing safety and API tests**

```ts
it("switches to gentle mode for clear emotional distress", () => {
  expect(detectSafetyMode("我最近很难受，觉得自己什么都做不好")).toBe("gentle");
});

it("rejects unsupported image types", async () => {
  const response = await POST(requestWith({ image: { mimeType: "image/gif", size: 20 } }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "INVALID_IMAGE_TYPE" });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/lib/safety src/app/api/roast/route.test.ts`
Expected: FAIL because policy and routes are missing.

- [ ] **Step 3: Implement deterministic validation and safety mode**

Accept only JPEG, PNG, and WEBP up to 10MB. Require text or image. Add the full prohibited-topic policy to the system prompt. Filter output for direct slurs and sensitive-identity attacks; if detected, retry once with `gentle` mode, then return the safe Mock result.

- [ ] **Step 4: Implement thin Route Handlers**

Each handler must parse input, call the corresponding service/router, validate output with Zod, standardize errors as `{ code, message, retryable }`, and never return provider error bodies or environment values.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/lib/safety src/app/api`
Expected: all validation, safe-mode, provider-failure, and response-shape tests pass.

Run: `git add src/lib/safety src/app/api && git commit -m "feat: add safe AI API routes"`

### Task 5: Build the retro television design system and shared layout

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Footer.tsx`
- Create: `src/components/layout/SafetyNotice.tsx`
- Create: `src/components/stage/SpotlightBackground.tsx`
- Create: `src/components/stage/RetroTvFrame.tsx`
- Create: `public/generated/stage-bg.webp`
- Create: `public/generated/sticker-sheet.webp`
- Test: `src/components/layout/Header.test.tsx`

- [ ] **Step 1: Write failing navigation and dialog tests**

```tsx
it("opens the safety notice from the footer", async () => {
  const user = userEvent.setup();
  render(<Footer />);
  await user.click(screen.getByRole("button", { name: "内容原则" }));
  expect(screen.getByRole("dialog", { name: "隐私与内容原则" })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/components/layout/Header.test.tsx`
Expected: FAIL because shared layout components are missing.

- [ ] **Step 3: Generate and validate decorative assets**

Use the image generation skill for a text-free 16:9 deep aubergine comedy stage background and a text-free sticker sheet containing a microphone, applause burst, ticket, trophy, and CRT controls. Copy selected assets to `public/generated/`, convert to WebP, keep each under 500KB, and confirm they contain no critical text.

- [ ] **Step 4: Implement tokens and shared components**

Define CSS variables for ink, ivory, signal yellow, live red, broadcast violet, borders, radii, shadows, type scale, and motion durations. Implement skip link, responsive Header, Footer, accessible modal, background fallback colors, visible focus, and reduced-motion rules.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/components/layout`
Expected: navigation and dialog tests pass.

Run: `npm run build`
Expected: exit code 0.

Run: `git add src/app src/components/layout src/components/stage public/generated && git commit -m "feat: add retro television design system"`

### Task 6: Build the homepage experience

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/home/HeroSection.tsx`
- Create: `src/components/home/AudienceExamples.tsx`
- Create: `src/components/home/ThreeStepTickets.tsx`
- Create: `src/components/roast/RoastLevelSelector.tsx`
- Test: `src/app/page.test.tsx`

- [ ] **Step 1: Replace the smoke test with failing homepage behavior tests**

```tsx
it("links the main CTA to the roast stage", () => {
  render(<HomePage />);
  expect(screen.getByRole("link", { name: "上传照片，开始吐槽" })).toHaveAttribute("href", "/roast");
});

it("defaults to familiar roasting", () => {
  render(<RoastLevelSelector value="familiar" onChange={vi.fn()} />);
  expect(screen.getByRole("radio", { name: /熟人互损/ })).toBeChecked();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/app/page.test.tsx`
Expected: FAIL because the homepage sections are missing.

- [ ] **Step 3: Implement the complete homepage**

Render the approved CRT hero, exact brief copy, example roast card and metrics, four audience examples, three ticket steps, three roast-level cards, privacy reassurance, bottom CTA, and footer. Add restrained Framer Motion entrances and a five-click Logo self-roast Easter egg.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/app/page.test.tsx`
Expected: CTA, examples, selector, and Easter-egg tests pass.

Run: `git add src/app/page.tsx src/components/home src/components/roast/RoastLevelSelector.tsx && git commit -m "feat: build retro comedy homepage"`

### Task 7: Build material input and generation flow

**Files:**
- Create: `src/app/roast/page.tsx`
- Create: `src/components/roast/RoastUploader.tsx`
- Create: `src/components/roast/TextMaterialInput.tsx`
- Create: `src/components/roast/RoastModeSelector.tsx`
- Create: `src/components/stage/LoadingComedyStage.tsx`
- Create: `src/lib/api/client.ts`
- Test: `src/components/roast/RoastUploader.test.tsx`
- Test: `src/app/roast/page.test.tsx`

- [ ] **Step 1: Write failing upload and submit tests**

```tsx
it("previews a valid image and rejects a GIF", async () => {
  const user = userEvent.setup();
  render(<RoastUploader value={null} onChange={vi.fn()} />);
  await user.upload(screen.getByLabelText("上传照片"), new File(["gif"], "x.gif", { type: "image/gif" }));
  expect(screen.getByRole("alert")).toHaveTextContent("仅支持 JPG、PNG 或 WEBP");
});

it("keeps user material when generation fails", async () => {
  server.use(failingRoastHandler);
  render(<RoastPage />);
  await userEvent.type(screen.getByRole("textbox"), "我的朋友圈文案");
  await userEvent.click(screen.getByRole("button", { name: "开始吐槽" }));
  expect(screen.getByRole("textbox")).toHaveValue("我的朋友圈文案");
  expect(screen.getByRole("button", { name: "重新开麦" })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/components/roast/RoastUploader.test.tsx src/app/roast/page.test.tsx`
Expected: FAIL because uploader and page do not exist.

- [ ] **Step 3: Implement uploader, text input, selectors, and API client**

Support drag/drop, preview, replacement, deletion, 10MB validation, text input, material chips, level confirmation, abortable request, programmatic navigation to `/result`, and privacy copy. Do not write the image to localStorage.

- [ ] **Step 4: Implement comedy loading states**

Cycle the six approved loading messages every 1.4 seconds, expose cancellation, and disable cycling under reduced motion while retaining a static status.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/components/roast src/app/roast`
Expected: upload, errors, submission, retry, privacy, and loading tests pass.

Run: `git add src/app/roast src/components/roast src/components/stage/LoadingComedyStage.tsx src/lib/api && git commit -m "feat: add roast material workflow"`

### Task 8: Build results, audience reactions, and local recovery

**Files:**
- Create: `src/app/result/page.tsx`
- Create: `src/components/roast/RoastResultCard.tsx`
- Create: `src/components/roast/BestJokeCard.tsx`
- Create: `src/components/roast/AudienceReactionBar.tsx`
- Test: `src/app/result/page.test.tsx`

- [ ] **Step 1: Write failing result behavior tests**

```tsx
it("renders observations and opens the battle from 不服", async () => {
  seedLatestRoast(validRoastResult);
  render(<ResultPage />);
  expect(screen.getAllByTestId("roast-observation")).toHaveLength(3);
  expect(screen.getByText("今晚最好笑的一句")).toBeVisible();
  expect(screen.getByRole("link", { name: "申请反击" })).toHaveAttribute("href", "/battle");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/app/result/page.test.tsx`
Expected: FAIL because result components are missing.

- [ ] **Step 3: Implement result reveal and reactions**

Load and validate the latest result, show an empty-state CTA when absent, reveal sentences with accessible live-region updates, render the best joke and reverse compliment, and animate reaction feedback without changing layout.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/app/result/page.test.tsx`
Expected: normal result, empty state, reactions, report link, and battle link pass.

Run: `git add src/app/result src/components/roast && git commit -m "feat: add interactive roast results"`

### Task 9: Build the five-round comeback battle

**Files:**
- Create: `src/app/battle/page.tsx`
- Create: `src/components/battle/ComebackBattle.tsx`
- Create: `src/components/battle/BattleScoreboard.tsx`
- Create: `src/lib/domain/battle.ts`
- Test: `src/lib/domain/battle.test.ts`
- Test: `src/app/battle/page.test.tsx`

- [ ] **Step 1: Write failing round-limit and scoring tests**

```ts
it("finishes after five rounds", () => {
  const state = Array.from({ length: 5 }).reduce(addMockRound, createBattle());
  expect(state.status).toBe("finished");
  expect(state.rounds).toHaveLength(5);
});

it("clamps every score between zero and one hundred", () => {
  expect(normalizeScores({ wit: 120, force: -1, stubbornness: 82, support: 51 }))
    .toEqual({ wit: 100, force: 0, stubbornness: 82, support: 51 });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/lib/domain/battle.test.ts src/app/battle/page.test.tsx`
Expected: FAIL because battle state and page are missing.

- [ ] **Step 3: Implement battle state and UI**

Add shortcut replies, custom input, round history, server calls, retry without losing the user line, accessible score labels, visual round bell, and one of four approved final outcomes. On mobile, stack user and AI panels vertically.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/lib/domain/battle.test.ts src/app/battle/page.test.tsx`
Expected: shortcut, custom reply, error retry, five-round limit, scoring, and finish-state tests pass.

Run: `git add src/app/battle src/components/battle src/lib/domain/battle.ts && git commit -m "feat: add five-round comeback battle"`

### Task 10: Build the report and PNG share poster

**Files:**
- Create: `src/app/report/page.tsx`
- Create: `src/components/report/RoastReport.tsx`
- Create: `src/components/report/ComedyMetricCard.tsx`
- Create: `src/components/report/AwardCard.tsx`
- Create: `src/components/report/SharePoster.tsx`
- Create: `src/lib/export/share-poster.ts`
- Test: `src/app/report/page.test.tsx`
- Test: `src/lib/export/share-poster.test.ts`

- [ ] **Step 1: Write failing report and export tests**

```tsx
it("labels fictional metrics and opens the share poster", async () => {
  seedLatestRoast(validRoastResult);
  render(<ReportPage />);
  expect(screen.getByText("以下数据均为喜剧化虚构，不是真实心理测量。")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "生成分享卡" }));
  expect(screen.getByRole("dialog", { name: "分享卡片预览" })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/app/report/page.test.tsx src/lib/export/share-poster.test.ts`
Expected: FAIL because report and exporter are missing.

- [ ] **Step 3: Implement report cards and vertical poster**

Render three tags, evidence-backed feature, metrics, award, best quote, copy action, replay links, and a 1080×1440 poster preview. Keep the poster text as DOM content and reserve a visual QR/site-address area.

- [ ] **Step 4: Implement export with failure recovery**

Use `html-to-image` to export PNG with embedded fonts and `pixelRatio: 2`. On failure, retain the open preview and show “导出失败，请重试；你仍可复制最佳金句”。

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/app/report src/lib/export`
Expected: labels, dialog, copy, export success, and export failure tests pass.

Run: `git add src/app/report src/components/report src/lib/export && git commit -m "feat: add roast report and share poster"`

### Task 11: Add Easter eggs, responsive polish, and accessibility

**Files:**
- Create: `src/lib/domain/easter-eggs.ts`
- Modify: `src/app/globals.css`
- Modify: relevant components under `src/components/`
- Test: `src/lib/domain/easter-eggs.test.ts`
- Test: `tests/e2e/accessibility.spec.ts`

- [ ] **Step 1: Write failing deterministic Easter-egg tests**

```ts
it("returns the evidence-destruction line after deleting material", () => {
  expect(getEasterEgg("material-deleted")).toBe("当事人正在尝试销毁喜剧证据。");
});

it("uses a static transition when reduced motion is enabled", () => {
  expect(getMotionProfile(true)).toEqual({ duration: 0, continuous: false });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/lib/domain/easter-eggs.test.ts`
Expected: FAIL because Easter-egg helpers are missing.

- [ ] **Step 3: Implement approved Easter eggs and responsive rules**

Add long-stare, repeated “不服”, re-upload, delete, sparse-input, strong-comeback, exit, and five-logo-click messages. Ensure 44px controls, no horizontal overflow, readable mobile type, stacked battle layout, full poster preview, and reduced-motion CSS.

- [ ] **Step 4: Add keyboard and motion browser checks**

Test skip link, modal focus return, keyboard submission, mobile viewport overflow, and `reducedMotion: "reduce"` behavior in Playwright.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/lib/domain/easter-eggs.test.ts`
Expected: all Easter-egg tests pass.

Run: `npm run test:e2e -- tests/e2e/accessibility.spec.ts`
Expected: keyboard, focus, viewport, and reduced-motion checks pass.

Run: `git add src tests/e2e/accessibility.spec.ts && git commit -m "feat: add accessible responsive comedy polish"`

### Task 12: Add end-to-end flows, documentation, and release verification

**Files:**
- Create: `tests/e2e/text-roast.spec.ts`
- Create: `tests/e2e/image-roast.spec.ts`
- Create: `tests/e2e/battle-report.spec.ts`
- Create: `.env.example`
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Write end-to-end tests against Mock mode**

```ts
test("text roast reaches a downloadable report", async ({ page }) => {
  await page.goto("/roast");
  await page.getByRole("textbox").fill("我的朋友圈每句话都有三个 Emoji 😎✨📷");
  await page.getByRole("button", { name: "开始吐槽" }).click();
  await expect(page).toHaveURL(/result/);
  await page.getByRole("link", { name: "领取吐槽报告" }).click();
  await page.getByRole("button", { name: "生成分享卡" }).click();
  await expect(page.getByRole("dialog", { name: "分享卡片预览" })).toBeVisible();
});
```

- [ ] **Step 2: Run tests and verify RED for any missing integration**

Run: `$env:AI_MOCK_MODE='true'; npm run test:e2e`
Expected before fixes: failures identify missing cross-page wiring rather than test setup errors.

- [ ] **Step 3: Fix only the integration gaps exposed by tests**

Wire navigation, local result recovery, report links, battle context, image fixture upload, and PNG download so the three full flows pass without adding new scope.

- [ ] **Step 4: Document configuration and privacy behavior**

`.env.example` must list every variable without values. README must explain install, local run, Mock mode, provider keys, model selection, image privacy, tests, build, and deployment constraints. Add `.superpowers/`, `.next/`, `node_modules/`, test output, and `.env*.local` to `.gitignore`.

- [ ] **Step 5: Run the complete verification suite**

Run: `npm run lint`
Expected: zero errors.

Run: `npm test`
Expected: all Vitest tests pass.

Run: `$env:AI_MOCK_MODE='true'; npm run test:e2e`
Expected: all Playwright tests pass.

Run: `npm run build`
Expected: exit code 0 with all routes built.

- [ ] **Step 6: Verify real-provider smoke paths without exposing keys**

With local environment keys configured, submit one short text request and one small test image. Confirm text reports DeepSeek as primary, image reports Kimi, no server log contains base64 image data or keys, and failed DeepSeek calls fall back to Kimi.

- [ ] **Step 7: Final commit**

Run: `git add .gitignore .env.example README.md tests src public package.json package-lock.json && git commit -m "test: verify complete AI roast show"`

## Self-review result

- Spec coverage: all five pages, two required dialogs, provider routing, safety, privacy, Mock mode, export, Easter eggs, responsiveness, motion reduction, generated assets, testing, documentation, and deployment configuration are mapped to tasks.
- Scope: tasks form one dependent product flow; no independent account, social, billing, or persistence subsystem is introduced.
- Type consistency: `RoastResult`, provider method names, routes, storage key, safety modes, level values, and score ranges are consistent across tasks.
- Placeholder scan: no deferred implementation markers remain.
