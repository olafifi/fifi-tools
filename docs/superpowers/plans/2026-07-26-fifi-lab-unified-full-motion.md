# FIFI Lab Unified Full Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage background, cat trail, tool-card tracking, and tool-delivery portal use the same full-strength motion profile in every modern browser while keeping motion speed and trail density stable when frames or pointer events are sparse.

**Architecture:** Add a small pure motion utility module for frame-time smoothing and time-resampled pointer trails. `InteractiveField` consumes the smoothing helper, while `CatCursor` consumes the trail sampler and browser coalesced events. Remove every `prefers-reduced-motion` strength branch from the four branded interactions; keep the rest of the site unchanged.

**Tech Stack:** React 19, TypeScript, Canvas 2D, CSS animations, Vitest, Playwright, Vite.

## Global Constraints

- Every browser receives the current full-strength motion profile; do not use UA, device tier, or `prefers-reduced-motion` to change intensity.
- Motion speed and pointer response must be based on elapsed milliseconds, not frame count.
- Cat trail density must be based on time-resampled pointer paths, not raw `pointermove` event count.
- Preserve the approved layout, palette, To-Do List, game windows, and tool destinations.
- Do not promise or emulate a fixed physical 60 FPS; browser and hardware scheduling remain authoritative.
- Stop after producing a production-build temporary preview; merge and publish only after user confirmation.

---

### Task 1: Add deterministic motion math

**Files:**
- Create: `app/lib/motion.ts`
- Create: `app/lib/motion.test.ts`

**Interfaces:**
- Produces: `frameSmoothingAlpha(deltaMs: number, maxDeltaMs?: number): number`.
- Produces: `createTrailSampler(options?: Partial<TrailSamplingOptions>): TrailSampler` with `push(sample: PointerSample): PointerPoint[]` and `reset(): void`.
- `PointerSample` is `{ x: number; y: number; time: number }`; `PointerPoint` is `{ x: number; y: number }`.
- Default trail options are `intervalMs: 60`, `minDistance: 9`, and `maxPointsPerPush: 12`.

- [ ] **Step 1: Write the failing frame-smoothing tests**

Add Vitest assertions that `frameSmoothingAlpha(1000 / 60)` is approximately `0.04`, that two 30 FPS advances produce the same remaining distance as four 60 FPS advances, and that negative or multi-second deltas are clamped safely.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- app/lib/motion.test.ts`

Expected: FAIL because `app/lib/motion.ts` does not exist.

- [ ] **Step 3: Implement elapsed-time smoothing**

Use the continuous equivalent of the current 4% per 60 Hz frame:

```ts
const FRAME_MS = 1000 / 60;
const PER_FRAME_REMAINDER = 0.96;

export function frameSmoothingAlpha(deltaMs: number, maxDeltaMs = 100) {
  const elapsed = Math.min(Math.max(deltaMs, 0), maxDeltaMs);
  return 1 - Math.pow(PER_FRAME_REMAINDER, elapsed / FRAME_MS);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- app/lib/motion.test.ts`

Expected: frame-smoothing tests PASS.

- [ ] **Step 5: Write failing trail-sampler tests**

Cover these real behaviors:

- the first sample emits one point immediately;
- a 180 ms straight path emits points at the same temporal positions whether delivered as one sparse segment or several dense segments;
- a stationary pointer emits no repeated cats;
- a large abnormal jump never emits more than 12 points in one push;
- `reset()` makes the next sample start a fresh path.

- [ ] **Step 6: Run the focused test and verify RED**

Run: `npm test -- app/lib/motion.test.ts`

Expected: FAIL because the trail sampler is not implemented.

- [ ] **Step 7: Implement the minimal time-resampled trail sampler**

The sampler stores the previous raw sample, the last emitted point, and the next 60 ms sampling time. For every segment, interpolate positions at each sampling time, emit only candidates at least 9 px from the last emitted point, and advance the sampling clock whether or not a point is emitted. If the per-push cap is reached, drop the remaining backlog and continue from the current sample time.

- [ ] **Step 8: Run the focused test and verify GREEN**

Run: `npm test -- app/lib/motion.test.ts`

Expected: all motion utility tests PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add app/lib/motion.ts app/lib/motion.test.ts
git commit -m "feat: 统一动效时间与轨迹采样"
```

### Task 2: Make background response frame-rate independent

**Files:**
- Modify: `app/components/InteractiveField.tsx`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `frameSmoothingAlpha(deltaMs)` from Task 1.
- Preserves: the existing canvas dimensions, three blobs, colors, 64-point contours, ripple amplitudes, and pointer push strength.

- [ ] **Step 1: Add a failing cross-profile browser assertion**

In the homepage motion helper, inspect the canvas over a controlled foreground interval in both default and `reducedMotion: 'reduce'` contexts. Assert both contexts continuously redraw and expose no artificial 66 ms frame gate. Keep the assertion based on observable canvas change rather than source-text matching.

- [ ] **Step 2: Run the focused browser test and verify RED**

Run: `npm run e2e -- --grep "motion profile"`

Expected: FAIL because the reduced context still uses the 66 ms gate and 36% motion strength.

- [ ] **Step 3: Update `InteractiveField`**

Remove `matchMedia`, `motionScale`, `frameInterval`, and `lastDraw`. Track the previous animation timestamp, compute `alpha = frameSmoothingAlpha(milliseconds - previousMilliseconds)`, and update both pointer axes with `current += (target - current) * alpha`. Keep ripple time as `milliseconds * 0.0003` and keep the existing full-strength ripple and push constants.

- [ ] **Step 4: Run unit and focused browser tests**

Run:

```bash
npm test -- app/lib/motion.test.ts
npm run e2e -- --grep "motion profile"
```

Expected: both commands PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add app/components/InteractiveField.tsx tests/e2e/home.spec.ts
git commit -m "fix: 统一背景波动速度与强度"
```

### Task 3: Make the cat trail and tool tilt identical across devices

**Files:**
- Modify: `app/components/CatCursor.tsx`
- Modify: `app/components/ToolGrid.tsx`
- Modify: `app/globals.css`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `createTrailSampler()` from Task 1.
- Uses: `PointerEvent.getCoalescedEvents()` when present, otherwise the original event.
- Preserves: `CAT_SVG`, four trail colors, cursor core, and `wake-cat-out` full animation.

- [ ] **Step 1: Strengthen the failing cross-profile test**

Send the same timestamped pointer path in default and reduced contexts. Assert both profiles produce the same cat count, each cat has `30px` width and `1.16s` animation duration, and the first tool card receives equal `--rx` and `--ry` values at the same relative pointer position.

- [ ] **Step 2: Run the focused browser test and verify RED**

Run: `npm run e2e -- --grep "motion profile"`

Expected: FAIL because reduced mode still generates smaller, shorter-lived, less frequent cats and scales tool tilt to 30%.

- [ ] **Step 3: Update `CatCursor`**

Remove the reduced-motion thresholds and class. Feed coalesced pointer samples in timestamp order into one sampler. Append one `.wake-cat` for each returned point while continuing to position the cursor core at the latest real event. Reset the sampler on pointer leave so re-entry starts a fresh path.

- [ ] **Step 4: Update tool tracking and CSS**

Remove the `matchMedia` multiplier from `ToolGrid`. Delete the reduced-motion CSS rules for `.tool-card` and `.wake-cat--reduced`; keep the normal card transform and `.wake-cat` animation as the only profile.

- [ ] **Step 5: Run unit and focused browser tests**

Run:

```bash
npm test -- app/lib/motion.test.ts
npm run e2e -- --grep "motion profile"
```

Expected: both commands PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add app/components/CatCursor.tsx app/components/ToolGrid.tsx app/globals.css tests/e2e/home.spec.ts
git commit -m "fix: 统一猫猫拖尾与工具跟随"
```

### Task 4: Use the complete tool portal everywhere

**Files:**
- Modify: `public/open-tool.js`
- Modify: `public/open-tool.css`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/games/tool-transition.test.mjs`

**Interfaces:**
- Produces: `html[data-motion="full"]` in every valid portal session.
- Preserves: approved tool resolution, fallback links, error state, and 1500 ms full-profile redirect.

- [ ] **Step 1: Write the failing portal tests**

Change the reduced-context browser expectation from `data-motion="reduced"` and an 820 ms redirect to `data-motion="full"`; assert the portal is still visible after 900 ms and redirects before 2200 ms. Add a static game test that rejects a reduced portal timeout or `cat-portal-reduced` keyframes.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm run test:games -- --test-name-pattern "tool transition"
npm run e2e -- --grep "tool portal"
```

Expected: FAIL because the reduced portal profile still exists.

- [ ] **Step 3: Remove the portal profile split**

Set `root.dataset.motion = 'full'` unconditionally for valid tools, always redirect after 1500 ms, remove `cat-portal-reduced`, and remove the portal `@media (prefers-reduced-motion: reduce)` block.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the same two focused commands from Step 2.

Expected: both commands PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add public/open-tool.js public/open-tool.css tests/e2e/home.spec.ts tests/games/tool-transition.test.mjs
git commit -m "fix: 所有设备播放完整传送动画"
```

### Task 5: Full verification and temporary production preview

**Files:**
- Modify only if verification exposes a requirement gap.
- Produce local ignored screenshots under `output/playwright/` when visual comparison is useful.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a clean feature branch and a production-build preview URL for user acceptance.

- [ ] **Step 1: Run formatting and full automated verification**

Run:

```bash
git diff --check
npm test
npm run test:games
npm run build
npm run e2e
```

Expected: 0 failures; only the existing environment-dependent leaderboard E2E cases may remain intentionally skipped.

- [ ] **Step 2: Inspect both browser motion preferences visually**

Open the production build in default and `reduce` contexts. Move the pointer through the same broad path and compare the background amplitude, cat size/density, card tilt, and portal animation. Confirm the approved To-Do List, games, clock, layout, and colors are unchanged.

- [ ] **Step 3: Run a production preview server**

Start `npm run preview -- --host 127.0.0.1 --port <available-port>` from the isolated worktree and keep it running for user inspection.

- [ ] **Step 4: Report the temporary URL and stop before integration**

Tell the user the feature branch has not been merged or pushed. Ask them to compare the local full-motion experience and the simulated reduced-motion experience before authorizing formal publication.
