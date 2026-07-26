import { useCallback, useEffect, useRef, useState } from 'react';
import { buildZipperGeometry } from '../lib/zipperGeometry';

type TodoItem = { id: string; text: string; done: boolean };
type DragState = { id: number; x: number; y: number; moved: boolean; startedExpanded: boolean };

const STORAGE_KEY = 'fifi-zipper-flap-todo-v1';
const INITIAL_GEOMETRY = buildZipperGeometry(0);

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultTodos(): TodoItem[] {
  return [
    { id: createId(), text: '今天要做什么呢？', done: false },
    { id: createId(), text: '想想今天要添加的计划', done: false },
    { id: createId(), text: '也可以给自己留一点空白', done: false }
  ];
}

function loadTodos(): TodoItem[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(stored)) return defaultTodos();
    return stored.slice(0, 8).map((item) => ({
      id: typeof item.id === 'string' ? item.id : createId(),
      text: String(item.text ?? '').slice(0, 50),
      done: Boolean(item.done)
    }));
  } catch {
    return defaultTodos();
  }
}

export function ZipperTodo() {
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos);
  const [expanded, setExpanded] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pullRef = useRef<HTMLButtonElement>(null);
  const lowerFabricRef = useRef<SVGPathElement>(null);
  const cavityRef = useRef<SVGPathElement>(null);
  const lowerLipShadowRef = useRef<SVGPathElement>(null);
  const lowerTeethRef = useRef<SVGPathElement>(null);
  const lowerSeamRef = useRef<SVGPathElement>(null);
  const contentClipRef = useRef<SVGPathElement>(null);
  const guideRef = useRef<SVGPathElement>(null);
  const progressRef = useRef(0);
  const animationFrameRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const clickStartedExpandedRef = useRef<boolean | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const geometry = useCallback((rawValue: number) => {
    const next = buildZipperGeometry(rawValue);
    progressRef.current = Math.max(0, Math.min(1, rawValue));
    lowerFabricRef.current?.setAttribute('d', next.lowerPath);
    lowerLipShadowRef.current?.setAttribute('d', next.lowerPath);
    lowerTeethRef.current?.setAttribute('d', next.lowerPath);
    lowerSeamRef.current?.setAttribute('d', next.lowerPath);
    cavityRef.current?.setAttribute('d', next.cavityPath);
    contentClipRef.current?.setAttribute('d', next.clipPath);
    if (pullRef.current) {
      pullRef.current.style.left = `${next.pullLeft}px`;
      pullRef.current.style.top = `${next.pullTop}px`;
      pullRef.current.style.transform = `rotate(${next.pullAngle}deg)`;
    }
  }, []);

  useEffect(() => {
    geometry(0);
    return () => window.cancelAnimationFrame(animationFrameRef.current);
  }, [geometry]);

  const animateTo = useCallback((target: 0 | 1) => {
    window.cancelAnimationFrame(animationFrameRef.current);
    const start = progressRef.current;
    const delta = target - start;
    const began = performance.now();
    const duration = 360 + Math.abs(delta) * 430;
    setExpanded(target === 1);
    setInteractive(false);
    setOpening(target === 1);
    setClosing(target === 0 && start > 0.02);

    const tick = (now: number) => {
      const raw = Math.min(1, (now - began) / duration);
      const ease = 1 - Math.pow(1 - raw, 4);
      geometry(start + delta * ease);
      if (raw < 1) animationFrameRef.current = window.requestAnimationFrame(tick);
      else {
        geometry(target);
        setOpening(false);
        if (target === 0) setClosing(false);
        else setInteractive(true);
      }
    };
    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, [geometry]);

  const pointerProgress = (event: React.PointerEvent<HTMLButtonElement>) => {
    const svg = svgRef.current;
    const guide = guideRef.current;
    const matrix = svg?.getScreenCTM()?.inverse();
    if (!svg || !guide || !matrix || typeof guide.getTotalLength !== 'function') return progressRef.current;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    const total = guide.getTotalLength();
    let bestLength = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= 100; i += 1) {
      const length = total * i / 100;
      const sample = guide.getPointAtLength(length);
      const distance = (sample.x - point.x) ** 2 + (sample.y - point.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestLength = length;
      }
    }
    let step = total / 100;
    for (let pass = 0; pass < 5; pass += 1) {
      for (const length of [bestLength - step, bestLength + step]) {
        const safe = Math.max(0, Math.min(total, length));
        const sample = guide.getPointAtLength(safe);
        const distance = (sample.x - point.x) ** 2 + (sample.y - point.y) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestLength = safe;
        }
      }
      step *= 0.5;
    }
    return 1 - bestLength / total;
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.classList.remove('dragging');
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag.moved) {
      suppressClickRef.current = true;
      clickStartedExpandedRef.current = null;
      animateTo(progressRef.current >= 0.48 ? 1 : 0);
    } else if (event.type === 'pointercancel') {
      clickStartedExpandedRef.current = null;
      animateTo(drag.startedExpanded ? 1 : 0);
    }
  };

  const doneCount = todos.filter((item) => item.done).length;
  const rootOpen = expanded || opening || closing || dragging;

  return (
    <section className={`todo-root${rootOpen ? ' open' : ''}${interactive ? ' interactive' : ''}${closing ? ' closing' : ''}`} aria-label="拉链 To-Do List">
      <svg className="todo-svg" viewBox="0 0 720 560" aria-hidden="true" ref={svgRef}>
        <defs>
          <path id="todo-upper-curve" d="M52 510 C160 356 390 198 660 240" />
          <path id="todo-title-curve" d="M73 444 C181 300 395 164 625 190" />
          <clipPath id="todo-content-clip" clipPathUnits="userSpaceOnUse">
            <path ref={contentClipRef} d={INITIAL_GEOMETRY.clipPath} />
          </clipPath>
        </defs>
        <path ref={lowerFabricRef} className="lower-fabric" d={INITIAL_GEOMETRY.lowerPath} />
        <path ref={cavityRef} className="todo-cavity" d={INITIAL_GEOMETRY.cavityPath} />
        <path d="M38 526 C140 345 382 171 677 222 L660 240 C390 198 160 356 52 510 Z" className="upper-fabric" />
        <path d="M52 510 C160 356 390 198 660 240" className="lip-shadow" />
        <path d="M52 510 C160 356 390 198 660 240" className="zip-teeth" />
        <path ref={lowerLipShadowRef} d="M52 510 C160 356 390 198 660 240" className="lip-shadow" />
        <path ref={lowerTeethRef} d="M52 510 C160 356 390 198 660 240" className="zip-teeth" />
        <path d="M42 520 C148 338 382 184 672 230" className="todo-seam" />
        <path ref={lowerSeamRef} d="M65 523 C175 372 402 218 672 258" className="todo-seam" />
        <path d="M73 444 C181 300 395 164 625 190" className="title-plate-shadow" pathLength="100" />
        <path d="M73 444 C181 300 395 164 625 190" className="title-plate" pathLength="100" />
        <text className="title-curve" dy="5"><textPath href="#todo-title-curve" startOffset="7%">TO-DO LIST</textPath></text>
        <text className="count-curve" dy="4"><textPath href="#todo-title-curve" startOffset="34%">我有 {todos.length} 条待办 · {doneCount} 条完成</textPath></text>
        <path ref={guideRef} d="M52 510 C160 356 390 198 660 240" className="zip-guide" />
      </svg>

      <div className="todo-tasks" aria-hidden={!expanded} hidden={!rootOpen}>
        {todos.map((item, index) => (
          <div
            className={`task-row${item.done ? ' done' : ''}`}
            key={item.id}
            style={{ left: 390 - index * 35, top: 278 + index * 31, width: 236 + index * 34 }}
          >
            <button
              aria-label={item.done ? '标记为未完成' : '标记为已完成'}
              className="task-check"
              onClick={() => setTodos((current) => current.map((todo) => todo.id === item.id ? { ...todo, done: !todo.done } : todo))}
              type="button"
              tabIndex={interactive ? 0 : -1}
            >
              <svg aria-hidden="true" viewBox="0 0 18 18">
                <path className="task-check__mark" d="M4 9.5 7.4 13 14 5.5" pathLength="1" />
              </svg>
            </button>
            <span className="task-input-shell">
              <input
                aria-label="待办内容"
                maxLength={50}
                onChange={(event) => setTodos((current) => current.map((todo) => todo.id === item.id ? { ...todo, text: event.target.value.slice(0, 50) } : todo))}
                value={item.text}
                tabIndex={interactive ? 0 : -1}
              />
              <span aria-hidden="true" className="task-strike" />
            </span>
            <button
              aria-label="删除任务"
              className="task-delete"
              onClick={() => setTodos((current) => current.filter((todo) => todo.id !== item.id))}
              type="button"
              tabIndex={interactive ? 0 : -1}
            >×</button>
          </div>
        ))}
        <button
          aria-label="新增任务"
          className="add-task"
          disabled={todos.length >= 8}
          onClick={() => setTodos((current) => current.length >= 8 ? current : [...current, { id: createId(), text: '', done: false }])}
          tabIndex={interactive ? 0 : -1}
          type="button"
        >＋</button>
      </div>

      <button
        aria-expanded={expanded}
        aria-label={expanded ? '收回 To-Do List' : '拉开 To-Do List'}
        className="zip-pull"
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          const startedExpanded = clickStartedExpandedRef.current;
          clickStartedExpandedRef.current = null;
          animateTo((startedExpanded ?? expanded) ? 0 : 1);
        }}
        onPointerCancel={endDrag}
        onPointerDown={(event) => {
          window.cancelAnimationFrame(animationFrameRef.current);
          clickStartedExpandedRef.current = expanded;
          dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, startedExpanded: expanded };
          event.currentTarget.setPointerCapture?.(event.pointerId);
          event.currentTarget.classList.add('dragging');
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || event.pointerId !== drag.id) return;
          if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) {
            drag.moved = true;
            clickStartedExpandedRef.current = null;
            setExpanded(false);
            setInteractive(false);
            setOpening(false);
            setClosing(false);
            setDragging(true);
          }
          if (!drag.moved) return;
          geometry(pointerProgress(event));
        }}
        onPointerUp={endDrag}
        ref={pullRef}
        type="button"
      />
    </section>
  );
}
