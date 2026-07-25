import { useRef, useState } from 'react';
import type { GameItem } from '../data/catalog';
import { BrandNav } from './BrandNav';
import { CatCursor } from './CatCursor';
import { GameStation } from './GameStation';
import { GameWindow } from './GameWindow';
import { Hero } from './Hero';
import { InteractiveField } from './InteractiveField';
import { LabClock } from './LabClock';
import { ToolGrid } from './ToolGrid';
import { ZipperTodo } from './ZipperTodo';

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
      <InteractiveField />
      <div className="fifi-noise" aria-hidden="true" />
      <div className="fifi-frame" aria-hidden="true" />
      <BrandNav />
      <LabClock />
      <main className="fifi-workspace">
        <GameStation onOpenGame={openGame} />
        <ToolGrid />
        <Hero />
      </main>
      <ZipperTodo />
      <CatCursor />
      <GameWindow game={selectedGame} onClose={closeGame} />
    </div>
  );
}
