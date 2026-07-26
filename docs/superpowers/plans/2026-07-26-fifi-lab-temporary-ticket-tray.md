# FIFI Lab Temporary Ticket Tray Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete local-only “蛋白临时票据传送盘” to FIFI Lab, simplify the homepage into a practical second-screen desk, and provide a production-build preview before any merge or publication.

**Architecture:** Keep ticket rules in pure TypeScript, persist records and Blob payloads through an IndexedDB adapter, expose one React hook as the state boundary, and render a bottom-right Danbai tray that expands into its own vertical conveyor. Persist destructive changes before their exit animations so refresh never restores discarded data. Remove the central hero while preserving all approved background, cursor, tool, game, clock, and To-Do interactions.

**Tech Stack:** React 19, TypeScript, IndexedDB, CSS animation, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Ticket data never leaves the browser and never enters the leaderboard service.
- The local workday changes at 06:00; opening or refocusing the page removes prior-workday tickets.
- Maximums are 20 tickets, 25 MiB per image/file, and 100 MiB total.
- The tray is the expanded container; do not add a conventional modal or unrelated rectangular window.
- Every browser profile receives the full tray animation, including `prefers-reduced-motion: reduce`.
- Preserve the approved background ellipses, cat cursor, five game entries, two tool entries, clock, and zipper To-Do List.
- Stop after a production-build temporary preview; merge and publish only after user confirmation.

---

### Task 1: Add deterministic ticket rules

**Files:**
- Create: `app/lib/tickets.ts`
- Create: `app/lib/tickets.test.ts`

- [ ] Write failing tests for the 06:00 workday boundary, URL/text classification, image/file classification, UTF-8 byte sizing, count limit, per-item limit, and total-size limit.
- [ ] Run `npm test -- app/lib/tickets.test.ts` and verify RED because the module is missing.
- [ ] Implement `TicketKind`, `TicketRecord`, `TicketDraft`, `workdayKeyAt`, `classifyText`, `draftFromFile`, `ticketByteSize`, and `validateCapacity`.
- [ ] Keep absolute `http:` and `https:` URLs as links; treat all other pasted strings as text.
- [ ] Run the focused test and verify GREEN.
- [ ] Commit with `feat: 添加临时票据规则`.

### Task 2: Persist tickets in IndexedDB

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `app/lib/ticketStore.ts`
- Create: `app/lib/ticketStore.test.ts`

- [ ] Add `fake-indexeddb` as a development dependency for deterministic store tests.
- [ ] Write failing tests for persistence across store instances, deletion, clear-all, prior-workday cleanup, and capacity rejection without partial writes.
- [ ] Implement `openTicketStore(factory?)` using database `fifi-temporary-ticket-tray` and object store `tickets`.
- [ ] Expose `list`, `addMany`, `remove`, `clear`, `clearExpired`, and `stats`; sort records newest first.
- [ ] Validate the complete incoming batch before opening the write transaction.
- [ ] Run `npm test -- app/lib/ticketStore.test.ts` and verify GREEN.
- [ ] Commit with `feat: 本地保存临时票据`.

### Task 3: Add the React ticket state boundary

**Files:**
- Create: `app/hooks/useTemporaryTickets.ts`
- Create: `app/hooks/useTemporaryTickets.test.tsx`

- [ ] Write failing hook tests for initial cleanup/load, neutral loading state, adding text/files, rejecting invalid capacity, individual discard, and clear-all.
- [ ] Implement the hook around one injected store promise so components never access IndexedDB directly.
- [ ] Schedule cleanup at the next local 06:00 and repeat after every boundary.
- [ ] Re-run cleanup on window focus and document visibility return.
- [ ] Surface friendly Chinese errors without clearing successful existing tickets.
- [ ] Run the focused tests and verify GREEN.
- [ ] Commit with `feat: 接入临时票据状态`.

### Task 4: Simplify the homepage and mount the collapsed tray

**Files:**
- Modify: `app/components/HomePage.test.tsx`
- Modify: `app/components/HomePage.tsx`
- Modify: `app/components/BrandNav.tsx`
- Modify: `app/globals.css`
- Create: `app/components/TemporaryTicketTray.tsx`

- [ ] Add failing assertions that the large central hero and Chinese brand/slogan are absent, the top brand says only `FIFI Lab`, and the ticket tray is present.
- [ ] Remove `Hero` from `HomePage` without changing the existing tools, games, clock, zipper, background, or cat cursor.
- [ ] Enlarge the top `F` mark and `FIFI Lab` wordmark slightly.
- [ ] Build the collapsed bottom-right Danbai tray using an existing Danbai asset and the `TODAY / NN` counter.
- [ ] Add accessible open/close controls and keep the collapsed footprint clear of other controls.
- [ ] Run component tests and build; verify GREEN.
- [ ] Commit with `feat: 精简副屏首页并加入蛋白托盘`.

### Task 5: Build the intake and conveyor tray

**Files:**
- Modify: `app/components/TemporaryTicketTray.tsx`
- Create: `app/components/TicketIntake.tsx`
- Create: `app/components/TicketConveyor.tsx`
- Create: `app/components/TicketCard.tsx`
- Modify: `app/globals.css`
- Modify: `app/components/HomePage.test.tsx`

- [ ] Write failing component tests for pasted text/link, multi-file input, drag/drop, capacity feedback, and ticket action labels.
- [ ] Expand the tray itself into a vertical conveyor with one intake mouth and stacked tickets.
- [ ] Accept paste only while focus is inside the intake; accept dragged or selected images/files.
- [ ] Show text copy, link open/copy, image preview/download, and file download actions.
- [ ] Create and revoke Blob object URLs at component lifecycle boundaries.
- [ ] Keep ticket cards legible at desktop and mobile widths without covering the clock or zipper controls.
- [ ] Run component tests and verify GREEN.
- [ ] Commit with `feat: 完成票据投放与传送带`.

### Task 6: Add destructive animations and the yellow clear handle

**Files:**
- Modify: `app/components/TemporaryTicketTray.tsx`
- Modify: `app/components/TicketConveyor.tsx`
- Modify: `app/components/TicketCard.tsx`
- Modify: `app/globals.css`
- Modify: `app/components/HomePage.test.tsx`

- [ ] Write failing tests that individual discard removes persistence immediately and that clear-all requires a completed pull or keyboard hold.
- [ ] On individual discard, delete from IndexedDB first and animate a visual clone through the shred slot.
- [ ] Add a yellow pointer-captured handle whose pull distance fills a visible progress track and springs back when released early.
- [ ] Clear persistence immediately when the threshold is crossed, then animate all visual ticket clones into the shredder.
- [ ] Support a long `Space`/`Enter` hold for keyboard users and cancel cleanly on blur or early release.
- [ ] Ensure refresh during any exit animation cannot resurrect deleted records.
- [ ] Run component tests and verify GREEN.
- [ ] Commit with `feat: 添加票据粉碎与清盘拉杆`.

### Task 7: Verify responsive layout and full-motion parity

**Files:**
- Modify: `tests/e2e/home.spec.ts`
- Modify: `app/globals.css`

- [ ] Add browser coverage for collapsed/expanded states, text and file persistence after reload, 06:00 cleanup through injected time, individual discard, and full clear.
- [ ] Run the same tray transition checks in default and reduced-motion browser contexts; assert identical animation names and durations.
- [ ] Capture and inspect desktop screenshots at 1366×768, 1440×900, and 1920×1080 plus one mobile viewport.
- [ ] Tune the desktop bottom-right tray and mobile near-full-width tray so no approved homepage control is obstructed.
- [ ] Run `npm test`, `npm run test:games`, `npm run e2e`, and `npm run build`.
- [ ] Commit with `test: 验证蛋白托盘完整体验`.

### Task 8: Prepare the temporary review site

**Files:**
- Modify only if needed: `README.md`

- [ ] Review the diff for unrelated edits and sensitive/local-only paths.
- [ ] Start a production build preview on an available local port and verify the exact preview URL loads.
- [ ] Inspect the main viewport visually and exercise open, intake, reload persistence, discard, and clear.
- [ ] Provide the temporary URL to the user and wait for explicit approval before merging or publishing.
