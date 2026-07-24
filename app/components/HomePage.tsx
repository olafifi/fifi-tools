import { useRef, useState } from 'react';
import type { GameItem } from '../data/catalog';
import { AboutFifi } from './AboutFifi';
import { BrandNav } from './BrandNav';
import { GameStation } from './GameStation';
import { GameWindow } from './GameWindow';
import { Hero } from './Hero';
import { ToolGrid } from './ToolGrid';

export function HomePage() {
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const openGame = (game: GameItem) => {
    triggerRef.current = document.activeElement as HTMLButtonElement | null;
    setSelectedGame(game);
  };

  const closeGame = () => {
    setSelectedGame(null);
    triggerRef.current?.focus();
  };

  return (
    <div className="site-shell">
      <BrandNav />
      <main>
        <Hero />
        <div className="home-content">
          <GameStation onOpenGame={openGame} />
          <ToolGrid />
        </div>
        <AboutFifi />
      </main>
      <GameWindow game={selectedGame} onClose={closeGame} />
      <footer>
        <span>© 2026 Fifi Lab</span>
        <span>2 个实用工具 · 5 个快乐小游戏</span>
      </footer>
    </div>
  );
}
