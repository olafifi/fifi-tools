import { GAMES, type GameItem } from '../data/catalog';

export function GameStation({ onOpenGame }: { onOpenGame: (game: GameItem) => void }) {
  return (
    <aside className="game-station" aria-labelledby="game-station-title">
      <span className="eyebrow">FUN ZONE</span>
      <h2 id="game-station-title">智力检测站</h2>
      <p>纯娱乐，检测结果不具参考价值。</p>
      <div className="game-list">
        {GAMES.map((game) => (
          <button
            aria-label={game.name}
            key={game.id}
            onClick={() => onOpenGame(game)}
            type="button"
          >
            <img alt="" aria-hidden="true" src={game.mascotAsset} />
            <span>{game.name}</span>
            <b aria-hidden="true">↗</b>
          </button>
        ))}
      </div>
      <small>想放空一下的时候，点开玩一局。</small>
    </aside>
  );
}
