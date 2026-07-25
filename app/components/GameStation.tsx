import { GAMES, type GameItem } from '../data/catalog';
import { GameIcon } from './GameIcon';

export function GameStation({ onOpenGame }: { onOpenGame: (game: GameItem) => void }) {
  return (
    <aside className="game-station" aria-labelledby="game-station-title">
      <div className="station-head">
        <small>PLAY / 05</small>
        <h2 id="game-station-title"><span>智力</span><span>检测站</span></h2>
      </div>
      <div className="game-list">
        {GAMES.map((game) => (
          <button
            aria-label={game.name}
            key={game.id}
            onClick={() => onOpenGame(game)}
            type="button"
          >
            <span className="game-icon" aria-hidden="true"><GameIcon id={game.id} /></span>
            <span>{game.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
