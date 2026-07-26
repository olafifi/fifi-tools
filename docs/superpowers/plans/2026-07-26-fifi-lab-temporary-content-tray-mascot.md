# FIFI Lab Temporary Content Tray Mascot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the reused Danbai expression with a dedicated tray-holding mascot, rename every visible surface to “临时内容托盘”, and add lively state-linked entrance animations without changing the approved homepage.

**Architecture:** Generate one project-bound transparent mascot PNG from the approved “赞美太阳” reference. Keep live count text and small content slips as HTML/CSS layers so they remain sharp and animatable. Add a small presentation-state helper that converts open/hover/count changes into stable CSS classes, while the existing IndexedDB data layer remains untouched.

**Tech Stack:** React 19, TypeScript, CSS animations, built-in image generation, PNG alpha processing, Vitest, Playwright, Vite.

## Global Constraints

- Visible product name is exactly `临时内容托盘`.
- No visible or accessibility text may use `票据`.
- Preserve the approved background, cat cursor, tools, games, clock, zipper To-Do List, storage limits, 06:00 cleanup, discard, and clear behavior.
- Use `赞美太阳.png` as the visual identity reference; preserve the grey tabby face and hand-drawn expression-pack character.
- Keep count text outside the bitmap.
- All browsers receive the full animation profile.

---

### Task 1: Lock the new name and animation state contract

**Files:**
- Create: `app/lib/contentTrayMotion.ts`
- Create: `app/lib/contentTrayMotion.test.ts`
- Modify: `app/components/HomePage.test.tsx`

**Interfaces:**
- Produces: `contentTrayMotion(previousCount: number, nextCount: number, open: boolean): 'idle' | 'receiving' | 'opening'`.

- [ ] Write a failing unit test that returns `receiving` only when the count increases, `opening` when open without a count increase, and `idle` otherwise.
- [ ] Add failing homepage assertions for region/title text `临时内容托盘` and absence of visible/accessibility text matching `/票据/`.
- [ ] Run `npm test -- app/lib/contentTrayMotion.test.ts app/components/HomePage.test.tsx` and verify RED.
- [ ] Implement the pure motion-state helper with the exact signature above.
- [ ] Run the focused test and verify GREEN.
- [ ] Commit with `test: 固定临时内容托盘命名与动画状态`.

### Task 2: Create and validate the tray-holding Danbai asset

**Files:**
- Reference: `D:/Workspace/蛋白/蛋白日历/WPS图片批量处理/赞美太阳.png`
- Create: `public/danbai/temporary-content-tray-mascot.png`

**Interfaces:**
- Produces: a transparent PNG consumed through `${import.meta.env.BASE_URL}danbai/temporary-content-tray-mascot.png`.

- [ ] Use the built-in image tool with the source as a reference: remove the sun/rays, preserve Danbai identity and hand-drawn texture, reposition both paws under one cream tray with dark outline and red rim, and place the opaque subject on a flat `#00ff00` chroma background.
- [ ] Save the generated source under the workspace and remove the chroma key with the installed alpha helper using soft matte and despill.
- [ ] Inspect the final PNG at original resolution; verify transparent corners, no green fringe, both paws visibly supporting the tray, no embedded text, and clear silhouette at approximately 100 px width.
- [ ] If the first result misses only one detail, make one targeted image edit and repeat alpha validation.
- [ ] Commit the selected alpha PNG with `feat: 添加举盘蛋白二创素材`.

### Task 3: Replace the entry composition and connect live animation

**Files:**
- Modify: `app/components/TemporaryTicketTray.tsx`
- Modify: `app/components/TicketIntake.tsx`
- Modify: `app/components/TicketConveyor.tsx`
- Modify: `app/hooks/useTemporaryTickets.ts`
- Modify: `app/lib/tickets.ts`
- Modify: `app/globals.css`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `contentTrayMotion(previousCount, nextCount, open)` and the mascot PNG from Task 2.

- [ ] Add a failing component/browser test that increasing the count applies `.is-receiving`, opening applies `.is-opening`, and the asset URL ends in `temporary-content-tray-mascot.png`.
- [ ] Run the focused tests and verify RED.
- [ ] Replace the old `expect.png` image and render independent `.tray-dock__slip`, `.tray-dock__spark`, count plate, and tray highlight layers.
- [ ] Track the previous count in a ref; keep `.is-receiving` for 720 ms after a successful increase and apply `.is-opening` during expansion.
- [ ] Rename the region, header, empty state, loading state, limit errors, clear prompt, and all relevant aria labels to use `内容` rather than `票据`.
- [ ] Add full-strength keyframes for breathing, delayed head/ear motion, counter-swinging tray, hover crouch/lift, falling content slip, load rebound, opening retreat, and closing catch.
- [ ] Run `npm test`, `npm run test:games`, focused Playwright tests, and `npm run build`.
- [ ] Commit with `feat: 完成临时内容托盘蛋白动效`.

### Task 4: Prepare the updated temporary review site

**Files:**
- No production file changes expected.

- [ ] Inspect collapsed, hover, receiving, open, and close states at 1440×900 and 375×812.
- [ ] Verify the production-build preview returns HTTP 200 at the temporary URL.
- [ ] Provide the temporary URL and wait for user approval before merging or publishing.

