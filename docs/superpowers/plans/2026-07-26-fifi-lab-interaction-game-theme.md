# FIFI Lab Interaction and Game Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 To-Do List 增加与拉链开口同步的动态裁切，加入本地数字时钟，统一五个游戏及窗口的 FIFI Lab 主题，并用 C 版“蛋白传送门”过渡页打开真实工具网址。

**Architecture:** 首页新增独立 `LabClock`，拉链几何提取为可测试的纯函数并由 `ZipperTodo` 同时驱动布面与 `clipPath`。五个游戏通过共享 CSS 变量获得统一材质，`GameItem` 只提供识别色；工具入口改为普通具名过渡页链接，由静态过渡页按白名单 tool id 跳转到真实网址。

**Tech Stack:** React 19、TypeScript、Vite、CSS/SVG、Canvas 2D、Vitest、Testing Library、Node test、Playwright。

## Global Constraints

- 总品牌固定为 `FIFI Lab / 菲菲实验站`，工具名固定为 `FiFi 图片处理工具` 与 `FiFi 富文本转换`。
- 首页背景波形、工具入口布局、五个游戏入口布局和猫猫光标不得改变。
- 五个游戏的玩法、输入、分数、存档和排行榜协议不得改变。
- 默认待办只在没有合法本地数据时创建，不能覆盖已有用户数据。
- 工具过渡页只允许 `image-processor` 与 `rich-text` 两个白名单 id，禁止接受任意 URL。
- 本次游戏静态资源统一使用版本 `20260726-enamel-theme`。
- 所有非必要动画遵守 `prefers-reduced-motion`。

---

## File Structure

- Create `app/lib/zipperGeometry.ts`: 计算拉链布面、内容裁切和拉链头位置的唯一纯函数。
- Create `app/lib/zipperGeometry.test.ts`: 验证闭合、半开、全开三种几何结果。
- Modify `app/components/ZipperTodo.tsx`: 使用同一几何结果更新 SVG 布面与内容裁切，并替换默认文案。
- Modify `app/components/HomePage.test.tsx`: 验证默认文案、本地数据保护和收起状态。
- Create `app/components/LabClock.tsx`: 显示并按秒更新本地时间。
- Create `app/components/LabClock.test.tsx`: 使用假时间验证格式、更新与清理。
- Modify `app/components/HomePage.tsx`: 挂载 `LabClock`。
- Modify `app/globals.css`: 添加时钟、动态裁切承载层和新版游戏窗口样式。
- Modify `app/data/catalog.ts`: 为游戏添加 theme，并统一 iframe 缓存版本。
- Modify `app/components/GameWindow.tsx`: 输出 `data-game-theme` 和主题 class。
- Modify `public/games/shared/game-shell.css`: 定义统一主题变量和基础控件材质。
- Modify `public/games/2048/fifi.css`: 迁移 2048 外壳到共享材质，保留方块动画和等级可读性。
- Modify `public/games/sudoku/style.css`: 使用统一材质和墨绿识别色。
- Modify `public/games/tetris/style.css`: 使用统一材质和赭金识别色。
- Modify `public/games/tetris/game.js`: 将 Canvas 方块与底色换为 FIFI Lab 色系。
- Modify `public/games/snake/style.css`: 使用统一材质和砖红识别色。
- Modify `public/games/snake/snake.js`: 将 Canvas 蛇、网格和备用食物换为 FIFI Lab 色系。
- Modify `public/games/merge-danbai/style.css`: 统一舞台、排行榜和失败面板，保留蛋白等级颜色。
- Modify all five `public/games/*/index.html`: 为共享 CSS、本地 CSS 和修改脚本增加统一版本参数。
- Create `public/open-tool.html`: C 版蛋白传送门过渡页语义结构和无脚本后备链接。
- Create `public/open-tool.css`: 传送门、全身蛋白和送达标签动画。
- Create `public/open-tool-config.js`: 提供只接受两个已知 tool id 的纯白名单解析函数。
- Create `public/open-tool.js`: 白名单解析、1.5 秒跳转、错误与 reduced-motion 降级。
- Modify `app/components/ToolGrid.tsx`: 打开具名过渡页，不再使用 `about:blank`、`document.write` 或 iframe。
- Modify `tests/games/catalog.test.mjs`: 验证五个游戏入口和子资源缓存版本一致。
- Modify `tests/games/delivery.test.mjs`: 验证过渡页白名单的实际跳转行为。
- Modify `tests/e2e/home.spec.ts`: 验证遮罩、时钟、游戏主题、窗口主题和工具跳转。

---

### Task 1: To-Do 拉链几何与动态裁切

**Files:**
- Create: `app/lib/zipperGeometry.ts`
- Create: `app/lib/zipperGeometry.test.ts`
- Modify: `app/components/ZipperTodo.tsx`
- Modify: `app/components/HomePage.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `buildZipperGeometry(progress: number): ZipperGeometry`
- `ZipperGeometry` contains `lowerPath`, `cavityPath`, `clipPath`, `pullLeft`, `pullTop`, `pullAngle`.
- `ZipperTodo` consumes one geometry result per animation frame and assigns `cavityPath` to both the visible cavity and SVG clip path.

- [ ] **Step 1: Write the failing pure-geometry tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildZipperGeometry } from './zipperGeometry';

describe('buildZipperGeometry', () => {
  it('clamps progress and keeps the content clip equal to the visible cavity', () => {
    const closed = buildZipperGeometry(-1);
    const open = buildZipperGeometry(2);
    expect(closed.cavityPath).toContain('L660.00 240.00');
    expect(open.cavityPath).toContain('L705.00 548.00');
    expect(closed.clipPath).toBe(closed.cavityPath);
    expect(open.clipPath).toBe(open.cavityPath);
  });

  it('places the half-open lower edge at the hand-derived midpoint', () => {
    const half = buildZipperGeometry(0.5);
    expect(half.cavityPath).toContain('L682.50 394.00');
  });
});
```

- [ ] **Step 2: Run the geometry test and verify RED**

Run: `npm test -- app/lib/zipperGeometry.test.ts`

Expected: FAIL because `zipperGeometry.ts` does not exist.

- [ ] **Step 3: Implement the pure geometry module**

Move the existing point constants, `pointMix`, `pointText`, and `splitUpper` from `ZipperTodo.tsx` into `app/lib/zipperGeometry.ts`. Implement progress clamping and return one `cavityPath` string for both the visible cavity and content clip:

```ts
export type ZipperGeometry = {
  lowerPath: string;
  cavityPath: string;
  clipPath: string;
  pullLeft: number;
  pullTop: number;
  pullAngle: number;
};

export function buildZipperGeometry(rawProgress: number): ZipperGeometry {
  const progress = Math.max(0, Math.min(1, rawProgress));
  // Reuse the current cubic split calculation.
  const cavityPath = `M${pointText(P0)} C${pointText(P1)} ${pointText(P2)} ${pointText(P3)} L${pointText(end)} C${pointText(c2)} ${pointText(c1)} ${pointText(split.q)} C${pointText(split.d)} ${pointText(split.a)} ${pointText(P0)} Z`;
  return { lowerPath, cavityPath, clipPath: cavityPath, pullLeft: split.q.x - 24, pullTop: split.q.y - 22, pullAngle };
}
```

- [ ] **Step 4: Run the geometry test and verify GREEN**

Run: `npm test -- app/lib/zipperGeometry.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Write failing component tests for neutral defaults and persistence**

Extend `HomePage.test.tsx`:

```tsx
it('uses neutral default todos without replacing saved todos', () => {
  const first = render(<HomePage />);
  expect(screen.getByDisplayValue('今天要做什么呢？')).toBeInTheDocument();
  expect(screen.getByDisplayValue('想想今天要添加的计划')).toBeInTheDocument();
  expect(screen.getByDisplayValue('也可以给自己留一点空白')).toBeInTheDocument();
  first.unmount();

  localStorage.setItem('fifi-zipper-flap-todo-v1', JSON.stringify([
    { id: 'saved', text: '我自己的计划', done: false }
  ]));
  render(<HomePage />);
  expect(screen.getByDisplayValue('我自己的计划')).toBeInTheDocument();
  expect(screen.queryByDisplayValue('今天要做什么呢？')).not.toBeInTheDocument();
});
```

The production bug named by this test is “new defaults overwrite saved data or retain work-specific copy.”

- [ ] **Step 6: Run the component test and verify RED**

Run: `npm test -- app/components/HomePage.test.tsx`

Expected: FAIL because the three old work-specific defaults are still rendered.

- [ ] **Step 7: Connect `ZipperTodo` to the geometry module and SVG clip path**

Add a clip path to the existing SVG and place the HTML task layer inside a clipped wrapper that shares the 720×560 coordinate system:

```tsx
<clipPath id="todo-content-clip" clipPathUnits="userSpaceOnUse">
  <path ref={contentClipRef} d={initialGeometry.clipPath} />
</clipPath>
```

In `geometry(progress)`, call `buildZipperGeometry(progress)`, update every existing path ref, and set `contentClipRef.current.setAttribute('d', next.clipPath)`. Set `.todo-tasks { clip-path: url(#todo-content-clip); }`. Add a React `dragging` state: keep tasks mounted while `dragging || expanded || closing`, and let the clip path control visibility. Set task controls to `tabIndex={expanded && !closing ? 0 : -1}`, set `aria-hidden={!expanded || closing}`, and keep pointer events disabled until `expanded && !closing`.

Replace the three defaults with the exact strings from the spec. Do not change the storage key.

- [ ] **Step 8: Run focused and full component tests**

Run: `npm test -- app/lib/zipperGeometry.test.ts app/components/HomePage.test.tsx`

Expected: all focused tests PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add app/lib/zipperGeometry.ts app/lib/zipperGeometry.test.ts app/components/ZipperTodo.tsx app/components/HomePage.test.tsx app/globals.css
git commit -m "fix: 让待办内容跟随拉链开口裁切"
```

---

### Task 2: 右上角本地数字时钟

**Files:**
- Create: `app/components/LabClock.tsx`
- Create: `app/components/LabClock.test.tsx`
- Modify: `app/components/HomePage.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `LabClock` with accessible labels `本地时间` and `今天日期`.
- Consumes: browser-local `Date`; no props and no network.

- [ ] **Step 1: Write failing clock tests**

```tsx
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LabClock } from './LabClock';

describe('LabClock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders local 24-hour time and advances on the next second boundary', () => {
    vi.setSystemTime(new Date(2026, 6, 26, 14, 8, 9, 250));
    render(<LabClock />);
    expect(screen.getByLabelText('本地时间')).toHaveTextContent('14:08:09');
    expect(screen.getByLabelText('今天日期')).toHaveTextContent('2026年07月26日 · 星期日');
    act(() => vi.advanceTimersByTime(750));
    expect(screen.getByLabelText('本地时间')).toHaveTextContent('14:08:10');
  });
});
```

- [ ] **Step 2: Run the clock test and verify RED**

Run: `npm test -- app/components/LabClock.test.tsx`

Expected: FAIL because `LabClock.tsx` does not exist.

- [ ] **Step 3: Implement `LabClock`**

Use `padStart(2, '0')` for digits and the literal Chinese weekday table `['星期日','星期一','星期二','星期三','星期四','星期五','星期六']`. Schedule the next update with `1000 - now.getMilliseconds()` and reschedule after each tick; clear the timeout on unmount.

Render:

```tsx
<section className="lab-clock" aria-label="FIFI Lab 数字时钟">
  <time aria-label="本地时间" className="lab-clock__time" dateTime={time}>{time}</time>
  <time aria-label="今天日期" className="lab-clock__date" dateTime={isoDate}>{dateLabel}</time>
</section>
```

- [ ] **Step 4: Mount and style the clock**

Place `<LabClock />` after `<BrandNav />` in `HomePage.tsx`. Position it below the right side of `.fifi-topbar`, inside the stable green area. Use bone backing, 3px black outline, gold label line, asymmetric corners, and hard shadow. At `max-width: 760px`, move the clock below the hero rather than covering tool cards.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- app/components/LabClock.test.tsx app/components/HomePage.test.tsx && npm run build`

Expected: all tests PASS and TypeScript build succeeds.

- [ ] **Step 6: Commit Task 2**

```bash
git add app/components/LabClock.tsx app/components/LabClock.test.tsx app/components/HomePage.tsx app/globals.css
git commit -m "feat: 在首页加入本地数字时钟"
```

---

### Task 3: 游戏主题数据与 FIFI Lab 悬浮窗口

**Files:**
- Modify: `app/data/catalog.ts`
- Modify: `app/components/GameWindow.tsx`
- Modify: `app/components/HomePage.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `GameItem` gains `theme: 'berry' | 'jade' | 'gold' | 'brick' | 'plum'`.
- `GameWindow` exposes `data-game-theme={game.theme}` and `game-window--${game.theme}`.

- [ ] **Step 1: Write a failing consumer test**

Open 2048 in `HomePage.test.tsx` and assert:

```tsx
const dialog = screen.getByRole('dialog', { name: '2048' });
expect(dialog).toHaveAttribute('data-game-theme', 'berry');
expect(dialog).toHaveClass('game-window--berry');
```

The production break this catches is a selected game losing its visual identity at the outer window boundary.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- app/components/HomePage.test.tsx`

Expected: FAIL because the dialog has no theme attribute or class.

- [ ] **Step 3: Add exact game themes and consume them**

Assign:

```ts
2048: 'berry'
sudoku: 'jade'
tetris: 'gold'
snake: 'brick'
merge-danbai: 'plum'
```

In `GameWindow`, add the theme class and data attribute. In `globals.css`, define each class’s `--game-accent`, then replace the purple window border, title bar, shadow, status panel and controls with the approved ink/bone/paper palette. Use the game accent only for a title marker and active control.

- [ ] **Step 4: Run component tests and build**

Run: `npm test -- app/components/HomePage.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add app/data/catalog.ts app/components/GameWindow.tsx app/components/HomePage.test.tsx app/globals.css
git commit -m "feat: 统一游戏悬浮窗口风格"
```

---

### Task 4: 五个游戏内部主题与缓存版本

**Files:**
- Modify: `public/games/shared/game-shell.css`
- Modify: `public/games/2048/fifi.css`
- Modify: `public/games/sudoku/style.css`
- Modify: `public/games/tetris/style.css`
- Modify: `public/games/tetris/game.js`
- Modify: `public/games/snake/style.css`
- Modify: `public/games/snake/snake.js`
- Modify: `public/games/merge-danbai/style.css`
- Modify: `public/games/2048/index.html`
- Modify: `public/games/sudoku/index.html`
- Modify: `public/games/tetris/index.html`
- Modify: `public/games/snake/index.html`
- Modify: `public/games/merge-danbai/index.html`
- Modify: `app/data/catalog.ts`
- Modify: `tests/games/catalog.test.mjs`
- Modify: `tests/games/delivery.test.mjs`

**Interfaces:**
- All game entry URLs and changed CSS/JS assets use revision `20260726-enamel-theme`.
- Canvas scripts read the same approved literal palette used by shared CSS.

- [ ] **Step 1: Write failing delivery tests for cache coherence**

Add a table-driven test with the hand-authored expected revision:

```js
test('all themed game entrypoints and changed assets share one cache revision', () => {
  const revision = '20260726-enamel-theme';
  const catalog = readFileSync('app/data/catalog.ts', 'utf8');
  for (const game of ['2048', 'sudoku', 'tetris', 'snake', 'merge-danbai']) {
    assert.match(catalog, new RegExp(`games/${game}/index\\.html[^\\n]+${revision}`));
    const html = readFileSync(`public/games/${game}/index.html`, 'utf8');
    assert.match(html, new RegExp(`game-shell\\.css\\?v=${revision}`));
    assert.match(html, new RegExp(`style(?:/main)?\\.css\\?v=${revision}|fifi\\.css\\?v=${revision}`));
  }
});
```

Add a Playwright test before implementation that opens Tetris and Snake, reads actual Canvas pixels with `getImageData`, and expects the literal empty-board colors `#211c17` for Tetris and `#f8efdc` for Snake. This verifies rendered behavior instead of scanning source text.

- [ ] **Step 2: Run game delivery tests and verify RED**

Run: `npm run test:games && npx playwright test tests/e2e/home.spec.ts --grep "game canvas theme"`

Expected: FAIL on missing shared revision and the two old rendered Canvas colors.

- [ ] **Step 3: Define the shared game theme**

In `game-shell.css`, add the exact variables from the spec and shared rules for `body`, buttons, score chips, borders, hard shadows, focus and disabled states. Do not impose fixed widths that can create iframe scrollbars.

- [ ] **Step 4: Theme 2048 and Sudoku**

2048 keeps `--tile-slide-duration: 240ms`, the current tile animation selectors and readable tier colors. Replace purple board chrome with ink/bone/berry variables. Sudoku uses jade for fixed digits and selected emphasis, brick red for invalid cells, and shared button/outline styles.

- [ ] **Step 5: Theme Tetris and Snake Canvas content**

Use these high-contrast Tetris colors:

```js
['#0000', '#a43828', '#d1a447', '#376b61', '#c9798d', '#7e3048', '#efe3c9', '#6f9b86']
```

Use `#211c17` for the Tetris Canvas background. For Snake use paper `#f8efdc`, subtle ink grid `rgba(9,8,6,.09)`, brick head `#a43828`, jade body `#376b61`, and gold fallback food `#d1a447`. Keep the existing蛋白 food image.

- [ ] **Step 6: Theme Merge Danbai without touching tier fills**

Replace the purple/pastel shell, leaderboard, game-over and buttons with shared material variables. Do not change the `tiers` fill/stroke values in `game.js`, `.aim-bubble`’s exact `var(--bubble-fill)` behavior, danger timing, score submission or leaderboard logic.

- [ ] **Step 7: Apply the shared cache revision everywhere**

Update every changed CSS and JS reference in the five game HTML files. Update catalog module URLs so `v=20260726-enamel-theme` remains present even when Merge Danbai also receives `leaderboardApi`.

- [ ] **Step 8: Run all game tests**

Run: `npm run test:games && npm test`

Expected: game delivery, 2048 motion, leaderboard, merge rules and React tests all PASS.

- [ ] **Step 9: Commit Task 4**

```bash
git add app/data/catalog.ts public/games tests/games
git commit -m "feat: 统一五个小游戏的视觉主题"
```

---

### Task 5: C 版蛋白传送门工具过渡页

**Files:**
- Create: `public/open-tool.html`
- Create: `public/open-tool.css`
- Create: `public/open-tool-config.js`
- Create: `public/open-tool.js`
- Modify: `app/components/ToolGrid.tsx`
- Modify: `app/data/catalog.ts`
- Modify: `app/components/HomePage.test.tsx`
- Modify: `tests/games/delivery.test.mjs`

**Interfaces:**
- `ToolItem` gains `transitionPath` generated from its id.
- `open-tool-config.js` exports `resolveTool(id)` and maps only `image-processor` and `rich-text` to fixed names and URLs.
- `open-tool.js` consumes the resolver and exports no globals.

- [ ] **Step 1: Write failing tool-link tests**

Update `HomePage.test.tsx` so the links’ `href` values are:

```tsx
expect(screen.getByRole('link', { name: 'FiFi 图片处理工具' }))
  .toHaveAttribute('href', '/open-tool.html?tool=image-processor');
expect(screen.getByRole('link', { name: 'FiFi 富文本转换' }))
  .toHaveAttribute('href', '/open-tool.html?tool=rich-text');
```

Retain `target="_blank"` and exact visible names.

- [ ] **Step 2: Run the component test and verify RED**

Run: `npm test -- app/components/HomePage.test.tsx`

Expected: FAIL because links still point directly to the tools and the click handler writes to `about:blank`.

- [ ] **Step 3: Add executable transition-page delivery tests**

In `delivery.test.mjs`, import the pure `resolveTool(id)` function from `public/open-tool-config.js` and assert literal results:

```js
assert.deepEqual(resolveTool('image-processor'), {
  name: 'FiFi 图片处理工具',
  href: 'https://olafifi.github.io/ui-image-processor/'
});
assert.deepEqual(resolveTool('rich-text'), {
  name: 'FiFi 富文本转换',
  href: 'https://olafifi.github.io/rich-text-translator/'
});
assert.equal(resolveTool('https://evil.example'), null);
```

Use `public/open-tool-config.js` as an ES module consumed by both the page and the Node test; no test-only production methods.

- [ ] **Step 4: Run delivery tests and verify RED**

Run: `npm run test:games`

Expected: FAIL because the resolver and transition assets do not exist.

- [ ] **Step 5: Implement the transition page**

Create semantic HTML containing the selected C draft: brick portal, jade portal, full-body vector Danbai, delivery ticket, status copy, error panel, home link and `<noscript>` links to both tools. Move the approved animation into `open-tool.css`; total default duration is 1500ms.

In `open-tool.js`:

```js
import { resolveTool } from './open-tool-config.js';

const tool = resolveTool(new URLSearchParams(location.search).get('tool'));
if (!tool) {
  document.documentElement.dataset.state = 'error';
} else {
  document.querySelector('[data-tool-name]').textContent = tool.name;
  document.querySelector('[data-fallback-link]').href = tool.href;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(() => location.replace(tool.href), reduced ? 180 : 1500);
}
```

- [ ] **Step 6: Replace `ToolGrid` document writing with normal links**

Delete `transitionPage`, `window.open('about:blank')`, `document.write` and iframe code. Set each anchor’s `href` to the base-aware transition path and retain `target="_blank" rel="noopener noreferrer"`. Plain anchor navigation prevents popup blocking during a direct user click and guarantees a non-empty address bar.

- [ ] **Step 7: Run focused tests and build**

Run: `npm test -- app/components/HomePage.test.tsx && npm run test:games && npm run build`

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add public/open-tool.html public/open-tool.css public/open-tool.js public/open-tool-config.js app/components/ToolGrid.tsx app/data/catalog.ts app/components/HomePage.test.tsx tests/games/delivery.test.mjs
git commit -m "feat: 加入蛋白传送门工具过渡页"
```

---

### Task 6: 浏览器行为与视觉回归

**Files:**
- Modify: `tests/e2e/home.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Browser tests consume the public homepage, game iframes and tool transition page.

- [ ] **Step 1: Write failing browser assertions for the new UI contracts**

Add tests that:

1. Freeze browser time and assert `14:08:09` plus `2026年07月26日 · 星期日`.
2. Assert every opened dialog has the expected `data-game-theme` and shared ink/bone computed colors.
3. Assert each game iframe exposes `--fifi-ink: #171411` and its expected `--game-accent`.
4. Open `./open-tool.html?tool=image-processor`, intercept the real tool URL, and assert the final page URL is `https://olafifi.github.io/ui-image-processor/`.
5. Open an invalid tool id and assert the error panel and FIFI Lab home link are visible.

- [ ] **Step 2: Run the focused browser tests and verify RED**

Run: `npx playwright test tests/e2e/home.spec.ts --grep "clock|theme|transition|zipper mask"`

Expected: FAIL until all observable behavior is present.

- [ ] **Step 3: Add zipper mask browser coverage**

Use the existing拉链 button for the full-open state and a real pointer drag for a partial state. Assert the `.todo-tasks` computed `clip-path` is not `none`, capture screenshots at approximately 40%, 65% and closing 40%, and use bounding-box sampling to confirm an item point outside the SVG cavity is not visible to hit testing.

- [ ] **Step 4: Update README**

Add the clock, dynamic拉链遮罩, unified game theme and C 版 tool transition to the existing Chinese feature list. Keep the zero-cost leaderboard and deployment instructions unchanged.

- [ ] **Step 5: Run the complete verification matrix**

```bash
npm test
npm run test:games
npm run build
npm run e2e
npm test --prefix server/leaderboard
git diff --check
```

Expected:

- React/Vitest tests all PASS.
- Game Node tests all PASS.
- Playwright tests all PASS except existing environment-gated leaderboard tests when their environment variables are absent.
- Leaderboard Worker tests all PASS.
- Build succeeds and `git diff --check` reports no errors.

- [ ] **Step 6: Perform real-browser visual QA**

At 1440×900 and 375×812, capture and inspect:

- 首页闭合 To-Do、40% 展开、65% 展开、完全展开和反向收回。
- 右上角时钟与绿色区域、顶部元信息和 hero 的关系。
- 五个游戏的外层窗口及内部页面。
- C 版过渡页开始、中段、送达和最终真实工具页面。

Compare the homepage screenshot with the approved baseline and confirm the background blobs, tool cards, game station and cat cursor are unchanged.

- [ ] **Step 7: Commit Task 6**

```bash
git add tests/e2e/home.spec.ts README.md
git commit -m "test: 覆盖首页交互与游戏主题"
```

---

### Task 7: 发布安全检查与正式验收

**Files:**
- No source changes expected.

**Interfaces:**
- Git remote: `origin/main`.
- Production URL: `https://olafifi.github.io/fifi-tools/`.

- [ ] **Step 1: Inspect repository state and staged scope**

Run `git status --short --branch`, `git log --oneline origin/main..HEAD`, `git diff origin/main...HEAD --stat`, and a targeted secret scan. Confirm `.superpowers/brainstorm/` and local screenshots remain ignored.

- [ ] **Step 2: Fetch and confirm fast-forward safety**

Run `git fetch origin main` and `git rev-list --left-right --count origin/main...HEAD`. The left count must be `0` before push.

- [ ] **Step 3: Push only after user has authorized publication**

Run `git push origin main` only if the current user request or a later confirmation explicitly authorizes publishing this iteration.

- [ ] **Step 4: Watch GitHub Pages and verify production**

Wait for the `deploy.yml` run to succeed. Verify the production page returns HTTP 200, the built bundle contains the clock/default copy/transition route, and the five game iframe URLs contain `20260726-enamel-theme`. Open both tools from the production homepage and verify the final address bar URLs.

- [ ] **Step 5: Final handoff**

Report the production URL, commit range, test totals, conditional skips, and any GitHub Actions warnings that do not block deployment.
