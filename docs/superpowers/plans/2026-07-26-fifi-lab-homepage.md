# FIFI Lab Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved FIFI Lab full-screen homepage, draggable zipper To-Do, Chinese README, and existing game/tool integrations.

**Architecture:** Keep the existing React/Vite application and `GameWindow` boundary. Split the new homepage into focused visual-interaction components, reuse the approved static assets, and keep To-Do state local to the browser.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Vitest, Testing Library, Playwright.

## Global Constraints

- Site brand is exactly `FIFI Lab`; the Chinese subtitle is “菲菲实验站”.
- Slogan is exactly “一些能让生活省点力气的小实验。”.
- Product names remain `FiFi 图片处理工具` and `FiFi 富文本转换`.
- The five games and current leaderboard implementation remain functional.
- To-Do data stays in localStorage, with at most 8 items and 50 characters per item.
- Approved background blobs, cat cursor trail, tool entries, and five game entries must remain visible.

---

### Task 1: Lock observable homepage and To-Do behavior

**Files:**
- Modify: `app/components/HomePage.test.tsx`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `HomePage`, existing `GameWindow` behavior.
- Produces: tests for exact branding, tool links, game controls, To-Do counts, limit, and responsive layout.

- [ ] **Step 1: Add failing component tests**

Add assertions for the `FIFI Lab` heading, exact slogan, exact product names, default three-item To-Do count, completed count changes, and eight-item add limit.

- [ ] **Step 2: Verify the tests fail for the missing formal homepage**

Run: `npm test -- app/components/HomePage.test.tsx`

Expected: failures for missing `FIFI Lab` structure and missing To-Do controls.

- [ ] **Step 3: Add failing E2E expectations**

Require `.fifi-frame`, `.game-station`, two `.tool-card` thumbnails, `.todo-root`, and exact site copy at desktop and mobile widths.

### Task 2: Build the formal homepage surfaces

**Files:**
- Create: `app/components/InteractiveField.tsx`
- Create: `app/components/CatCursor.tsx`
- Create: `app/components/GameIcon.tsx`
- Modify: `app/components/BrandNav.tsx`
- Modify: `app/components/Hero.tsx`
- Modify: `app/components/GameStation.tsx`
- Modify: `app/components/ToolGrid.tsx`
- Modify: `app/components/HomePage.tsx`
- Modify: `app/data/catalog.ts`
- Create: `public/icons/game-2048.svg`
- Create: `public/icons/game-sudoku.svg`
- Create: `public/icons/game-tetris.svg`
- Create: `public/icons/game-snake.svg`
- Create: `public/tools/image-processor-preview.png`
- Create: `public/tools/rich-text-preview.png`

**Interfaces:**
- `InteractiveField(): JSX.Element` renders the animated background canvas.
- `CatCursor(): JSX.Element` renders the pointer trail without intercepting input.
- `GameIcon({ id }): JSX.Element` renders the matching semantic game icon.
- `ToolGrid` opens the selected production tool through the thumbnail transition.

- [ ] **Step 1: Implement the three-blob canvas and cursor trail**

Port the approved canvas geometry and cat-head SVG trail into effect-scoped React components with cleanup and reduced-motion guards.

- [ ] **Step 2: Implement the brand, hero, tools, and game station**

Render the exact brand strings and approved left-cluster/right-breathing layout while preserving `GameWindow` callbacks.

- [ ] **Step 3: Add semantic SVG icons and tool thumbnails**

Use vector gameplay icons for the first four games, a circular Danbai tier icon for merge, and the approved real screenshots for both tools.

- [ ] **Step 4: Run component tests**

Run: `npm test -- app/components/HomePage.test.tsx`

Expected: branding, tool, game, and existing dialog tests pass; To-Do tests still fail until Task 3.

### Task 3: Implement the draggable zipper To-Do

**Files:**
- Create: `app/components/ZipperTodo.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `ZipperTodo(): JSX.Element` owns browser-local task state and renders the curved zipper.
- localStorage key: `fifi-zipper-flap-todo-v1`.

- [ ] **Step 1: Implement local task behavior**

Load or seed three tasks, cap the list at eight items, cap text at fifty characters, and calculate total/completed counts.

- [ ] **Step 2: Implement click and drag opening**

Keep the zipper pull on the upper cubic path, update the lower flap geometry from one shared split point, and snap at 48% on release.

- [ ] **Step 3: Implement curved typography and staggered rows**

Place title and count text at the center of a raised 24px bone-colored curve. Use forward opening delays and reverse closing delays.

- [ ] **Step 4: Verify component behavior**

Run: `npm test -- app/components/HomePage.test.tsx`

Expected: all homepage and To-Do component tests pass.

### Task 4: Complete styling and documentation

**Files:**
- Modify: `app/globals.css`
- Modify: `README.md`
- Modify: `index.html`

**Interfaces:**
- Desktop uses one full viewport; narrow screens use a vertically extended layout with no horizontal overflow.
- README documents the public URL, contents, privacy model, tests, leaderboard, and publishing.

- [ ] **Step 1: Finish responsive CSS and existing game dialog compatibility**

Protect the desktop playfield, keep all entries readable, and retain the existing modal dimensions and focus treatment.

- [ ] **Step 2: Rewrite README in Chinese**

Use the approved brand/product strings and document local operation, tests, deployment, leaderboard, privacy, and licenses.

- [ ] **Step 3: Update the browser title**

Set `index.html` title to `FIFI Lab · 菲菲实验站`.

### Task 5: Verify, review, commit, and publish

**Files:**
- Review all files changed by Tasks 1-4.

**Interfaces:**
- Produces a tested commit on `main` and a fast-forward push to `origin/main`.

- [ ] **Step 1: Run the full verification suite**

Run: `npm test`, `npm run test:games`, `npm run build`, and `npm run e2e -- tests/e2e/home.spec.ts`.

- [ ] **Step 2: Run browser visual QA**

Check closed/open To-Do states at desktop size, confirm tool/game entries and zero console errors.

- [ ] **Step 3: Review public diff and sensitive content**

Confirm no `.superpowers`, local absolute paths, tokens, cookies, `.env`, raw transcripts, or unrelated generated output is staged.

- [ ] **Step 4: Commit and push**

Create a Chinese commit describing the FIFI Lab homepage release and push `main` to `origin/main` without force.

- [ ] **Step 5: Verify GitHub Pages**

Wait for the Pages workflow and confirm the public homepage reflects the new brand and layout.
