const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const revisionedAsset = (path: string, revision: string) =>
  `${asset(path)}?v=${encodeURIComponent(revision)}`;
const leaderboardApiBase = import.meta.env.VITE_LEADERBOARD_API_BASE || '';
const gameModule = (path: string, revision: string, apiBase = '') => {
  const params = new URLSearchParams({ v: revision });
  if (apiBase) params.set('leaderboardApi', apiBase);
  return `${asset(path)}?${params.toString()}`;
};

export type ToolItem = {
  id: string;
  name: string;
  href: string;
  thumbnailAsset: string;
  accent: 'red' | 'jade';
};

export type GameItem = {
  id: '2048' | 'sudoku' | 'tetris' | 'snake' | 'merge-danbai';
  name: string;
  mascotAsset: string;
  modulePath: string;
  preferredWidth: number;
  preferredHeight: number;
  inputMode: 'keyboard' | 'pointer' | 'both';
  theme: 'berry' | 'jade' | 'gold' | 'brick' | 'plum';
};

export const TOOLS: ToolItem[] = [
  {
    id: 'image-processor',
    name: 'FiFi 图片处理工具',
    href: 'https://olafifi.github.io/ui-image-processor/',
    thumbnailAsset: asset('tools/image-processor-preview.png'),
    accent: 'red'
  },
  {
    id: 'rich-text',
    name: 'FiFi 富文本转换',
    href: 'https://olafifi.github.io/rich-text-translator/',
    thumbnailAsset: asset('tools/rich-text-preview.png'),
    accent: 'jade'
  }
];

export const GAMES: GameItem[] = [
  {
    id: '2048',
    name: '2048',
    mascotAsset: asset('icons/game-2048.svg'),
    modulePath: revisionedAsset('games/2048/index.html', '20260726-enamel-theme'),
    preferredWidth: 820,
    preferredHeight: 760,
    inputMode: 'both',
    theme: 'berry'
  },
  {
    id: 'sudoku',
    name: '数独',
    mascotAsset: asset('icons/game-sudoku.svg'),
    modulePath: revisionedAsset('games/sudoku/index.html', '20260726-enamel-theme'),
    preferredWidth: 820,
    preferredHeight: 760,
    inputMode: 'both',
    theme: 'jade'
  },
  {
    id: 'tetris',
    name: '俄罗斯方块',
    mascotAsset: asset('icons/game-tetris.svg'),
    modulePath: revisionedAsset('games/tetris/index.html', '20260726-enamel-theme'),
    preferredWidth: 820,
    preferredHeight: 760,
    inputMode: 'both',
    theme: 'gold'
  },
  {
    id: 'snake',
    name: '贪吃蛇',
    mascotAsset: asset('icons/game-snake.svg'),
    modulePath: revisionedAsset('games/snake/index.html', '20260726-enamel-theme'),
    preferredWidth: 820,
    preferredHeight: 760,
    inputMode: 'both',
    theme: 'brick'
  },
  {
    id: 'merge-danbai',
    name: '合成大蛋白',
    mascotAsset: asset('danbai/expect.png'),
    modulePath: gameModule('games/merge-danbai/index.html', '20260726-enamel-theme', leaderboardApiBase),
    preferredWidth: 820,
    preferredHeight: 760,
    inputMode: 'both',
    theme: 'plum'
  }
];
