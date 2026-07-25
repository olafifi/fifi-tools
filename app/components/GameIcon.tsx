import type { GameItem } from '../data/catalog';

export function GameIcon({ id }: { id: GameItem['id'] }) {
  if (id === 'merge-danbai') {
    return <img src={`${import.meta.env.BASE_URL}danbai/expect.png`} alt="" />;
  }
  return <img src={`${import.meta.env.BASE_URL}icons/game-${id}.svg`} alt="" />;
}
