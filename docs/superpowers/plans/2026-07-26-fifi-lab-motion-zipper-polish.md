# FIFI Lab Motion and Zipper Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore visible branded motion on every supported device and remove the zipper To-Do List's click, masking, layering, and completion-animation defects.

**Architecture:** Keep the existing React/Vite homepage and SVG zipper geometry. Motion remains component-local, with `prefers-reduced-motion` selecting a restrained profile instead of disabling behavior; zipper interaction keeps one continuous progress value while click and drag use separate state transitions; all todo controls share one SVG clip path generated with an inner safety edge.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, Playwright with installed Chrome, SVG/CSS animations, GitHub Pages.

## Global Constraints

- Do not change the approved homepage layout, background shapes, tool entries, five game entries, cat cursor shape, or color system.
- Normal motion keeps the existing full background, cursor trail, card tracking, and approximately 1.5-second tool portal.
- Reduced motion must remain visibly animated with smaller amplitude, lower frequency, fewer cursor particles, lighter card motion, and an approximately 0.8-second portal; it must never become a static page.
- Touch devices do not need simulated hover, but background breathing and the tool portal must still animate.
- The add button is hidden and disabled until zipper progress reaches 100% and the panel is interactive.
- Todo completion count updates immediately; visual order is circle/check, left-to-right strike, then subtle text de-emphasis.
- Todo content and the add button must stay inside an inner clip edge approximately 18 SVG units away from the lower zipper lip.
- Keep the eight-item and fifty-character limits unchanged.
- No new runtime dependency.

---

### Task 1: Replace the all-or-nothing motion gate with full and reduced profiles

**Files:**
- Modify: `tests/e2e/home.spec.ts`
- Modify: `app/components/InteractiveField.tsx`
- Modify: `app/components/CatCursor.tsx`
- Modify: `app/components/ToolGrid.tsx`
- Modify: `app/globals.css`
- Modify: `public/open-tool.js`
- Modify: `public/open-tool.css`

**Interfaces:**
- Consumes: browser media query `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- Produces: `data-motion="full" | "reduced"` on the portal document root and `.wake-cat--reduced` on reduced cursor particles.
- Produces: the same existing component props and public URLs; no caller changes.

- [ ] **Step 1: Write failing real-browser tests for both motion profiles**

Add a helper that gathers observable motion without mocking the browser:

```ts
async function motionEvidence(page: Page) {
  const canvas = page.locator('canvas.interactive-field');
  const before = await canvas.screenshot();
  await page.mouse.move(280, 220);
  await page.waitForTimeout(180);
  const after = await canvas.screenshot();
  return {
    canvasChanged: !before.equals(after),
    trailCount: await page.locator('.wake-cat').count(),
    cursorOpacity: await page.locator('.cursor-core').evaluate((node) => getComputedStyle(node).opacity),
    cardTransform: await page.locator('.tool-card').first().evaluate((node) => getComputedStyle(node).transform)
  };
}
```

Add one default-motion test and a nested reduced-motion test using `test.use({ reducedMotion: 'reduce' })`. Both must assert `canvasChanged === true`, `trailCount > 0`, and `cursorOpacity === '1'`; after hovering the first tool card, both must assert its transform is not `none`. For the reduced portal, route the external tool URL, navigate to `./open-tool.html?tool=image-processor`, assert `html[data-motion="reduced"]`, wait 300 ms and assert the portal page is still present, then assert redirect completes within 2 seconds.

- [ ] **Step 2: Run the focused test and verify the reduced profile fails**

Run:

```powershell
npx playwright test tests/e2e/home.spec.ts --project=chromium --grep "motion profile|reduced portal"
```

Expected: normal motion passes; reduced motion fails because no cursor trail exists, the cursor is hidden, the card transform is `none`, and the portal redirects after 180 ms.

- [ ] **Step 3: Implement the reduced background and cursor profile**

In `InteractiveField.tsx`, always register pointer movement and always schedule drawing. Replace the boolean stop gate with constants:

```ts
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionScale = reducedMotion ? 0.36 : 1;
const frameInterval = reducedMotion ? 66 : 0;
let lastDraw = -frameInterval;
```

Scale ripple time and pointer push by `motionScale`, skip only frames that arrive before `frameInterval`, and schedule the next frame in every profile.

In `CatCursor.tsx`, remove the early return for reduced motion. Use `minDelay = reducedMotion ? 140 : 60`, `minDistance = reducedMotion ? 18 : 9`, and append `wake-cat--reduced` to reduced particles while keeping the existing SVG unchanged.

In `ToolGrid.tsx`, calculate rotation with `motionScale = matchMedia(...).matches ? 0.3 : 1`; keep the existing pointer position calculation and CSS variables.

- [ ] **Step 4: Replace global CSS disabling with component-specific restrained motion**

Remove the universal `.01ms` rule and the rules that hide `.wake-layer`, `.cursor-core`, or force `.tool-card.is-tracking` to `transform: none`. Add reduced declarations that preserve visible movement:

```css
@media (prefers-reduced-motion: reduce) {
  .tool-card { transition-duration: .18s; }
  .tool-card.is-tracking { transform: perspective(760px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translate3d(0, -2px, 0); }
  .wake-cat--reduced { width: 20px; height: 20px; animation-duration: .52s; }
}
```

- [ ] **Step 5: Keep the reduced portal visible for a restrained transition**

In `open-tool.js`, set the document profile and use an 820 ms redirect:

```js
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
root.dataset.motion = reduced ? 'reduced' : 'full';
window.setTimeout(() => window.location.replace(tool.href), reduced ? 820 : 1500);
```

Replace the portal's `animation: none` media query with shorter, lower-motion animations. Keep the portal rings moving slowly, run the cat and ticket for about `.72s` and `.78s`, and run the progress bar for `.8s`. Add a reduced cat keyframe whose travel is materially shorter than `cat-portal` while still showing entry, movement, and disappearance.

- [ ] **Step 6: Run the focused tests and commit**

Run:

```powershell
npx playwright test tests/e2e/home.spec.ts --project=chromium --grep "motion profile|reduced portal"
```

Expected: PASS in both profiles with no console, page, or failed-request errors.

Commit:

```powershell
git add tests/e2e/home.spec.ts app/components/InteractiveField.tsx app/components/CatCursor.tsx app/components/ToolGrid.tsx app/globals.css public/open-tool.js public/open-tool.css
git commit -m "fix: restore motion across visitor settings"
```

---

### Task 2: Separate zipper click and drag state and clip the add button

**Files:**
- Modify: `app/components/ZipperTodo.tsx`
- Modify: `app/components/HomePage.test.tsx`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing `animateTo(target: 0 | 1)` and `progressRef`.
- Produces: `DragState` with `startedExpanded: boolean`; click leaves drag state untouched until motion crosses five pixels.
- Produces: `.add-task` as a child of `.todo-tasks`, visible only under `.todo-root.interactive`.

- [ ] **Step 1: Write failing component and browser regression tests**

In `HomePage.test.tsx`, add a test that opens the todo, waits for the button label to become `收回 To-Do List`, clicks it, and immediately asserts it returns to `拉开 To-Do List` with `aria-expanded="false"`. The stable target state changes synchronously even though the geometry continues animating with `requestAnimationFrame`.

In `home.spec.ts`, add a real-browser test:

```ts
test('zipper click closes after a complete open and the add button waits for interactivity', async ({ page }) => {
  await page.goto('./');
  const pull = page.locator('.zip-pull');
  const add = page.getByRole('button', { name: '新增任务' });
  await pull.click();
  await expect(page.locator('.todo-root')).toHaveClass(/interactive/);
  await expect(add).toBeVisible();
  await pull.click();
  await expect(page.locator('.todo-root')).not.toHaveClass(/open/);
  await expect(add).toBeHidden();
});
```

Also assert `add.evaluate(node => node.parentElement?.classList.contains('todo-tasks'))` is `true`. During a drag to roughly 50%, assert the add button remains hidden and is not enabled for pointer interaction.

- [ ] **Step 2: Run the focused tests and verify they fail for the known reasons**

Run:

```powershell
npx vitest run app/components/HomePage.test.tsx
npx playwright test tests/e2e/home.spec.ts --project=chromium --grep "zipper click closes"
```

Expected: the second click leaves the zipper open, and the DOM-parent assertion fails because `.add-task` is outside `.todo-tasks`.

- [ ] **Step 3: Keep stable click state until a real drag begins**

Change the drag type and event behavior:

```ts
type DragState = {
  id: number;
  x: number;
  y: number;
  moved: boolean;
  startedExpanded: boolean;
};
```

On `pointerdown`, record `startedExpanded: expanded`, capture the pointer, and cancel the running frame, but do not call `setExpanded(false)`, `setInteractive(false)`, `setOpening(false)`, `setClosing(false)`, or `setDragging(true)` yet. On the first `pointermove` beyond five pixels, mark `moved`, disable interaction, clear opening/closing state, and set dragging. On `pointerup`, only call the progress-threshold snap when `moved` is true; otherwise let the subsequent click call `animateTo(expanded ? 0 : 1)` from the unchanged stable state.

- [ ] **Step 4: Move the add button into the clipped content layer**

Move the existing `.add-task` button immediately after the mapped task rows but before `</div>` for `.todo-tasks`. Change CSS visibility to:

```css
.todo-root.interactive .add-task {
  opacity: 1;
  transform: none;
  pointer-events: auto !important;
  transition-delay: .08s;
}
.todo-root.open:not(.interactive) .add-task,
.todo-root.closing .add-task {
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none !important;
  transition-delay: 0s;
}
```

Keep its visual position, eight-item limit, and disabled styling unchanged.

- [ ] **Step 5: Run focused tests and commit**

Run:

```powershell
npx vitest run app/components/HomePage.test.tsx
npx playwright test tests/e2e/home.spec.ts --project=chromium --grep "zipper click closes"
```

Expected: PASS; a complete open closes by click, drag does not double-toggle, and add is absent until interactive.

Commit:

```powershell
git add app/components/ZipperTodo.tsx app/components/HomePage.test.tsx tests/e2e/home.spec.ts app/globals.css
git commit -m "fix: separate zipper click and drag behavior"
```

---

### Task 3: Give todo content an inner zipper-safe clip path

**Files:**
- Modify: `app/lib/zipperGeometry.ts`
- Modify: `app/lib/zipperGeometry.test.ts`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `buildZipperGeometry(rawProgress: number): ZipperGeometry`.
- Produces: `clipPath` whose lower boundary is inset by `CONTENT_INSET = 18` SVG units while `cavityPath` and `lowerPath` remain visually unchanged.

- [ ] **Step 1: Replace the equality test with hand-derived inner-edge expectations**

Change the geometry test to assert:

```ts
it('keeps the content clip inside the visible lower zipper edge', () => {
  const half = buildZipperGeometry(0.5);
  const open = buildZipperGeometry(1);
  expect(half.cavityPath).toContain('L682.50 394.00');
  expect(half.clipPath).toContain('L682.50 376.00');
  expect(open.cavityPath).toContain('L705.00 548.00');
  expect(open.clipPath).toContain('L705.00 530.00');
  expect(open.clipPath).not.toBe(open.cavityPath);
});
```

Add an e2e assertion that at fully open state the clip path contains `L705.00 530.00` and that the last visible task/add-button boxes do not cross the lower zipper safety region.

- [ ] **Step 2: Run the geometry test and verify it fails**

Run:

```powershell
npx vitest run app/lib/zipperGeometry.test.ts
```

Expected: FAIL because `clipPath` still equals `cavityPath` and contains y coordinates 394 and 548.

- [ ] **Step 3: Generate a separate inner clip path**

Add:

```ts
const CONTENT_INSET = 18;
const inward = (point: Point): Point => ({ x: point.x, y: point.y - CONTENT_INSET });
```

Keep `split.q` as the zero-gap join beside the pull head. Offset `end`, `c2`, and `c1` inward when building the reversed lower portion of `clipPath`, while retaining the existing upper curve and residual curve back to `P0`:

```ts
const safeEnd = inward(end);
const safeC2 = inward(c2);
const safeC1 = inward(c1);
const clipPath = `M${pointText(P0)} C${pointText(P1)} ${pointText(P2)} ${pointText(P3)} L${pointText(safeEnd)} C${pointText(safeC2)} ${pointText(safeC1)} ${pointText(split.q)} C${pointText(split.d)} ${pointText(split.a)} ${pointText(P0)} Z`;
```

Return this separate `clipPath`; do not change `lowerPath`, `cavityPath`, pull coordinates, or pull angle.

- [ ] **Step 4: Run geometry and zipper browser tests and commit**

Run:

```powershell
npx vitest run app/lib/zipperGeometry.test.ts
npx playwright test tests/e2e/home.spec.ts --project=chromium --grep "zipper|clip"
```

Expected: PASS at closed, half-open, and fully open progress.

Commit:

```powershell
git add app/lib/zipperGeometry.ts app/lib/zipperGeometry.test.ts tests/e2e/home.spec.ts
git commit -m "fix: inset todo content from zipper edge"
```

---

### Task 4: Animate todo completion as check, strike, and de-emphasis

**Files:**
- Modify: `app/components/ZipperTodo.tsx`
- Modify: `app/components/HomePage.test.tsx`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing `TodoItem.done` boolean and completion-count derivation.
- Produces: `.task-check__mark` SVG path with `pathLength="1"`, `.task-input-shell`, and `.task-strike` for CSS-driven reversible animation.

- [ ] **Step 1: Write failing DOM and real-browser animation tests**

In `HomePage.test.tsx`, assert every check button contains `.task-check__mark` and every input is wrapped by `.task-input-shell` containing `.task-strike`. Click the first check and keep the existing immediate count assertion.

In `home.spec.ts`, open the todo, read initial computed styles, click the first check, and assert:

```ts
await expect(firstRow).toHaveClass(/done/);
await expect(firstRow.locator('.task-check__mark')).toHaveCSS('stroke-dashoffset', '0px');
await expect(firstRow.locator('.task-strike')).toHaveCSS('transform', /matrix\(1, 0, 0, 1,/);
await expect(page.locator('.count-curve')).toHaveText('我有 3 条待办 · 1 条完成');
```

Click again and assert the row is not done, the count returns to zero, and the mark/strike return to their hidden styles.

- [ ] **Step 2: Run the tests and verify the new animation hooks are missing**

Run:

```powershell
npx vitest run app/components/HomePage.test.tsx
npx playwright test tests/e2e/home.spec.ts --project=chromium --grep "check and strike"
```

Expected: FAIL because the SVG mark, input shell, and strike element do not exist.

- [ ] **Step 3: Add stable SVG and text-line animation elements**

Render the check mark in every state instead of inserting/removing a text glyph:

```tsx
<button className="task-check" ...>
  <svg aria-hidden="true" viewBox="0 0 18 18">
    <path className="task-check__mark" d="M4 9.5 7.4 13 14 5.5" pathLength="1" />
  </svg>
</button>
```

Wrap the input without changing its label or value handling:

```tsx
<span className="task-input-shell">
  <input aria-label="待办内容" ... />
  <span aria-hidden="true" className="task-strike" />
</span>
```

- [ ] **Step 4: Implement the reversible CSS sequence**

Remove the instant text-decoration and whole-row opacity override. Add:

```css
.task-check { transition: background-color .14s ease, transform .14s ease; }
.task-check svg { width: 15px; height: 15px; overflow: visible; }
.task-check__mark { fill: none; stroke: var(--ink); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset .18s ease; }
.task-row.done .task-check__mark { stroke-dashoffset: 0; transition-delay: .08s; }
.task-input-shell { position: relative; min-width: 0; }
.task-strike { position: absolute; z-index: 2; left: 0; right: 0; top: 50%; border-top: 2px solid var(--red); transform: scaleX(0); transform-origin: left center; transition: transform .28s cubic-bezier(.2,.8,.2,1); pointer-events: none; }
.task-row.done .task-strike { transform: scaleX(1); transition-delay: .22s; }
.task-row input { transition: color .18s ease; }
.task-row.done input { color: #746b5f; transition-delay: .5s; }
```

For unchecking, remove the delayed declarations through the non-done selectors so the strike and check retract promptly. The row position and panel geometry must not change.

- [ ] **Step 5: Run the focused tests and commit**

Run:

```powershell
npx vitest run app/components/HomePage.test.tsx
npx playwright test tests/e2e/home.spec.ts --project=chromium --grep "check and strike"
```

Expected: PASS; count updates immediately and the visual hooks reach both completed and uncompleted states.

Commit:

```powershell
git add app/components/ZipperTodo.tsx app/components/HomePage.test.tsx tests/e2e/home.spec.ts app/globals.css
git commit -m "feat: animate todo completion feedback"
```

---

### Task 5: Full regression, visual QA, publication, and project memory

**Files:**
- Modify only if a verification failure reveals an in-scope defect.
- Create: `output/playwright/fifi-motion-full.png` (ignored/local artifact)
- Create: `output/playwright/fifi-motion-reduced.png` (ignored/local artifact)
- Modify: project memory under alias `fifi-tools.windows` after reading memory conventions.

**Interfaces:**
- Consumes: Tasks 1–4 and the existing GitHub Pages workflow.
- Produces: verified production build and updated private project pitfall entry.

- [ ] **Step 1: Run all automated checks**

Run:

```powershell
npm test
npm run test:games
npm run build
npm run e2e
git diff --check
```

Expected: all commands exit 0 with no new console or request errors.

- [ ] **Step 2: Perform desktop visual QA in both motion profiles**

Use installed Chrome at 1440×900. Capture the fully open zipper, a half-open drag state, a completed task, and the add button in full and reduced profiles. Confirm the approved tools, game station, background shapes, clock, typography, and cat artwork are unchanged.

- [ ] **Step 3: Verify the production-style preview and external tool URLs**

Run the built preview at `/fifi-tools/`, enter both tools from the homepage, and confirm each portal visibly animates before reaching its configured non-empty URL. Confirm no horizontal scrollbar is introduced at 375×812, 768×900, and 1440×900.

- [ ] **Step 4: Commit any final in-scope verification adjustment**

If no adjustment was needed, do not create an empty commit. If one was needed, stage only its exact files and commit with a message describing the verified defect.

- [ ] **Step 5: Run publish-safety checks, push main, and verify GitHub Pages**

Read and follow `agent-publish-safety`. Confirm `git status --short`, inspect every outgoing commit, scan tracked files for secrets and machine-local absolute paths, push `main` without force, wait for the Pages workflow, and verify `https://olafifi.github.io/fifi-tools/` from the homepage entry points in both motion profiles.

- [ ] **Step 6: Record the reusable failure mode privately**

Read the memory layout, tag vocabulary, and path mapping conventions. Add a project-specific pitfall explaining that a global `prefers-reduced-motion` kill switch can erase the site's defining interactions, and that branded motion should degrade to a restrained visible profile rather than a blank static fallback. Update `memory-projects/fifi-tools/MEMORY.md` without storing hardcoded local paths or transcript details.
