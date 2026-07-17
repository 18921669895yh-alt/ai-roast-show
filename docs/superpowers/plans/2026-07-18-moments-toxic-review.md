# Moments Toxic Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the public product into a consistent, non-repetitive social-post review experience with escalating fire levels.

**Architecture:** Keep the current roast result schema. Move confirmation behavior entirely into `RoastLevelSelector`, use `toxic-prompts.ts` as the sole intensity contract, and remove public consumers of the legacy battle flow.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library, Zod.

---

### Task 1: Extreme-only confirmation

**Files:**
- Modify: `src/components/roast/RoastLevelSelector.test.tsx`
- Modify: `src/components/roast/RoastLevelSelector.tsx`

- [ ] Write tests showing stage selects immediately and extreme opens the site-style confirmation.
- [ ] Run the selector test and confirm it fails against the old stage confirmation behavior.
- [ ] Move confirmation state and focus restoration from `stage` to `extreme`; update dialog copy to 100% extreme mode.
- [ ] Run selector tests and confirm they pass.

### Task 2: Intensity and anti-repetition prompt contract

**Files:**
- Modify: `src/lib/ai/toxic-prompts.ts`
- Modify: `src/lib/ai/prompts.test.ts`

- [ ] Write tests for all four level contracts and anti-repetition wording.
- [ ] Run prompt tests and confirm they fail before the prompt update.
- [ ] Add level-specific density and uniqueness requirements to the system and user prompts.
- [ ] Run prompt tests and confirm they pass.

### Task 3: Public content sweep

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/result/page.tsx`
- Modify: `src/app/report/page.tsx`
- Modify: `src/components/report/RoastReport.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/components/roast/TextMaterialInput.tsx`
- Modify: related page/component tests

- [ ] Write tests for other-person wording and absent legacy duel links.
- [ ] Run those tests and confirm they fail before the content sweep.
- [ ] Replace legacy self-roast, host, audience, stage, and duel copy with post-review copy; remove public battle links.
- [ ] Run those tests and confirm they pass.

### Task 4: Verification and deployment

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Commit, push both working branch and `main`, then verify the deployment URL responds with HTTP 200.
