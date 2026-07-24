import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameItem } from '../data/catalog';
import { postGameCommand } from '../lib/gameBridge';

export function GameWindow({
  game,
  onClose
}: {
  game: GameItem | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [load, setLoad] = useState<{
    gameId: GameItem['id'] | null;
    phase: 'loading' | 'ready' | 'error';
  }>({ gameId: null, phase: 'loading' });

  const phase = game && load.gameId === game.id ? load.phase : 'loading';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!game || !dialog) return;

    dialog.showModal();
    document.body.classList.add('game-is-open');

    return () => {
      postGameCommand(frameRef.current, 'destroy');
      document.body.classList.remove('game-is-open');
    };
  }, [game]);

  useEffect(() => {
    if (!game) return;

    const receiveReady = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        event.data?.source !== 'fifi-game' ||
        event.data?.type !== 'ready' ||
        event.data?.gameId !== game.id
      ) return;

      setLoad({ gameId: game.id, phase: 'ready' });
    };

    window.addEventListener('message', receiveReady);
    return () => window.removeEventListener('message', receiveReady);
  }, [game]);

  useEffect(() => {
    if (!game || phase !== 'loading') return;

    const timeout = window.setTimeout(() => {
      setLoad({ gameId: game.id, phase: 'error' });
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [frameKey, game, phase]);

  if (!game) return null;

  const close = () => {
    postGameCommand(frameRef.current, 'destroy');
    dialogRef.current?.close();
    setLoad({ gameId: null, phase: 'loading' });
    setFrameKey((current) => current + 1);
    onClose();
  };

  const restart = () => postGameCommand(frameRef.current, 'restart');

  const retry = () => {
    setLoad({ gameId: game.id, phase: 'loading' });
    setFrameKey((current) => current + 1);
  };

  return (
    <dialog
      aria-labelledby="game-window-title"
      className="game-window"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      ref={dialogRef}
      style={{
        '--game-width': `${game.preferredWidth}px`,
        '--game-height': `${game.preferredHeight}px`
      } as CSSProperties}
    >
      <header className="game-window__bar">
        <div className="game-window__title">
          <img alt="" aria-hidden="true" src={game.mascotAsset} />
          <h2 id="game-window-title">{game.name}</h2>
        </div>
        <div className="game-window__actions">
          <button
            aria-label={`重新开始 ${game.name}`}
            disabled={phase !== 'ready'}
            onClick={restart}
            type="button"
          >↻</button>
          <button aria-label={`关闭 ${game.name}`} onClick={close} type="button">×</button>
        </div>
      </header>
      <div className="game-window__stage">
        <iframe
          key={`${game.id}-${frameKey}`}
          onError={() => setLoad({ gameId: game.id, phase: 'error' })}
          ref={frameRef}
          src={game.modulePath}
          title={`${game.name} 游戏区域`}
        />
        {phase === 'loading' && (
          <div className="game-window__status" role="status">
            <strong>蛋白正在准备游戏…</strong>
            <span>第一次打开可能需要一点点时间。</span>
          </div>
        )}
        {phase === 'error' && (
          <div className="game-window__status" role="alert">
            <strong>游戏没有成功加载</strong>
            <span>可以重新加载，也可以先关闭窗口再试。</span>
            <button aria-label={`重新加载 ${game.name}`} onClick={retry} type="button">
              重新加载
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
