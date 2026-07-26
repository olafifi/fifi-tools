import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useTemporaryTickets } from '../hooks/useTemporaryTickets';
import { contentTrayMotion } from '../lib/contentTrayMotion';
import type { TicketRecord } from '../lib/tickets';
import { TicketConveyor } from './TicketConveyor';
import { TicketIntake } from './TicketIntake';

const PULL_DISTANCE = 112;
const KEY_HOLD_MS = 900;

export function TemporaryTicketTray() {
  const tray = useTemporaryTickets();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [ghosts, setGhosts] = useState<Array<TicketRecord & { clearing?: boolean }>>([]);
  const pointerStart = useRef<number | null>(null);
  const keyboardTimer = useRef<number>(0);
  const keyboardFrame = useRef<number>(0);
  const keyboardStarted = useRef(0);
  const clearStarted = useRef(false);
  const previousCount = useRef(0);
  const receiveTimer = useRef<number>(0);
  const closeTimer = useRef<number>(0);

  const mascotAsset = `${import.meta.env.BASE_URL}danbai/temporary-content-tray-mascot.png`;

  useEffect(() => {
    const motion = contentTrayMotion(previousCount.current, tray.tickets.length, open);
    previousCount.current = tray.tickets.length;
    if (motion !== 'receiving') return;
    window.clearTimeout(receiveTimer.current);
    setReceiving(true);
    receiveTimer.current = window.setTimeout(() => setReceiving(false), 720);
  }, [open, tray.tickets.length]);

  const finishGhosts = () => window.setTimeout(() => setGhosts([]), 720);

  const discard = async (ticket: TicketRecord) => {
    setGhosts((current) => [...current, ticket]);
    await tray.discard(ticket.id);
    finishGhosts();
  };

  const clearAll = async () => {
    if (clearStarted.current || tray.tickets.length === 0) return;
    clearStarted.current = true;
    setPullProgress(1);
    setGhosts(tray.tickets.map((ticket) => ({ ...ticket, clearing: true })));
    await tray.clearAll();
    finishGhosts();
    window.setTimeout(() => {
      setPullProgress(0);
      clearStarted.current = false;
    }, 760);
  };

  const resetPull = () => {
    pointerStart.current = null;
    if (!clearStarted.current) setPullProgress(0);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    pointerStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerStart.current === null || clearStarted.current) return;
    const next = Math.max(0, Math.min(1, (event.clientY - pointerStart.current) / PULL_DISTANCE));
    setPullProgress(next);
    if (next >= 1) void clearAll();
  };

  const stopKeyboardPull = () => {
    window.clearTimeout(keyboardTimer.current);
    cancelAnimationFrame(keyboardFrame.current);
    if (!clearStarted.current) setPullProgress(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat) return;
    event.preventDefault();
    keyboardStarted.current = performance.now();
    const animate = (time: number) => {
      setPullProgress(Math.min(1, (time - keyboardStarted.current) / KEY_HOLD_MS));
      if (time - keyboardStarted.current < KEY_HOLD_MS) keyboardFrame.current = requestAnimationFrame(animate);
    };
    keyboardFrame.current = requestAnimationFrame(animate);
    keyboardTimer.current = window.setTimeout(() => void clearAll(), KEY_HOLD_MS);
  };

  useEffect(() => () => {
    stopKeyboardPull();
    window.clearTimeout(receiveTimer.current);
    window.clearTimeout(closeTimer.current);
  }, []);

  const openTray = () => {
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
  };

  const closeTray = () => {
    setClosing(true);
    setOpen(false);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setClosing(false), 760);
  };

  const style = { '--pull-progress': pullProgress } as CSSProperties;

  return (
    <section
      className={`temporary-tray${open ? ' is-open is-opening' : ''}${closing ? ' is-closing' : ''}${receiving ? ' is-receiving' : ''}`}
      style={style}
      aria-label="临时内容托盘"
    >
      <button
        type="button"
        className="tray-dock"
        aria-expanded={open}
        aria-controls="temporary-ticket-tray-panel"
        onClick={openTray}
      >
        <span className="tray-dock__mascot" aria-hidden="true">
          <img className="tray-dock__body" src={mascotAsset} alt="" />
          <img className="tray-dock__lifted-tray" src={mascotAsset} alt="" />
        </span>
        <span className="tray-dock__slip" aria-hidden="true" />
        <span className="tray-dock__spark" aria-hidden="true">✦</span>
        <span className="tray-dock__plate">
          <small>TODAY</small>
          <b>{String(tray.tickets.length).padStart(2, '0')}</b>
        </span>
        <i aria-hidden="true">↖</i>
      </button>

      <aside id="temporary-ticket-tray-panel" className="tray-machine" aria-hidden={!open}>
        <div className="tray-machine__cap">
          <div>
            <span>临时内容托盘</span>
            <small>LOCAL · TODAY / {String(tray.tickets.length).padStart(2, '0')}</small>
          </div>
          <button type="button" tabIndex={open ? 0 : -1} onClick={closeTray} aria-label="收起临时内容托盘">×</button>
        </div>

        <div className="tray-machine__body">
          <TicketIntake onAddText={tray.addText} onAddFiles={tray.addFiles} />
          {tray.error && (
            <button type="button" className="ticket-error" onClick={tray.dismissError}>
              {tray.error}<span>×</span>
            </button>
          )}
          {tray.loading ? <div className="ticket-loading">蛋白正在检查今天的内容…</div> : (
            <TicketConveyor tickets={tray.tickets} ghosts={ghosts} onDiscard={(ticket) => void discard(ticket)} />
          )}
          <div className="tray-shredder" aria-hidden="true"><span /> <b>SHRED</b> <span /></div>
        </div>

        <div className="tray-clear-zone">
          <p>{tray.tickets.length ? '向下拉到底，清空今天的全部内容' : '托盘已经清空'}</p>
          <div className="tray-clear-track"><i /></div>
          <button
            type="button"
            className="tray-clear-handle"
            tabIndex={open ? 0 : -1}
            disabled={tray.tickets.length === 0}
            aria-label="长拉清空全部内容"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={resetPull}
            onPointerCancel={resetPull}
            onKeyDown={onKeyDown}
            onKeyUp={stopKeyboardPull}
            onBlur={stopKeyboardPull}
          >
            <span>!</span><b>CLEAR</b>
          </button>
        </div>
      </aside>
    </section>
  );
}
