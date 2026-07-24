const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export type ToolItem = {
  id: string;
  projectNo: string;
  name: string;
  description: string;
  href: string;
  tags: string[];
  mascotAsset: string;
  accent: 'white' | 'pink';
};

export type GameItem = {
  id: '2048' | 'sudoku' | 'tetris' | 'snake' | 'merge-danbai';
  name: string;
  mascotAsset: string;
  modulePath: string;
  preferredWidth: number;
  preferredHeight: number;
  inputMode: 'keyboard' | 'pointer' | 'both';
};

export const TOOLS: ToolItem[] = [
  {
    id: 'image-processor',
    projectNo: 'PROJECT 01',
    name: 'FIFI 图片处理',
    description: '在浏览器本地完成抠图、裁剪、格式转换和批量导出。',
    href: 'https://olafifi.github.io/ui-image-processor/',
    tags: ['IMAGE', 'LOCAL', 'BATCH'],
    mascotAsset: asset('danbai/cool.png'),
    accent: 'white'
  },
  {
    id: 'rich-text',
    projectNo: 'PROJECT 02',
    name: 'FIFI-Richly',
    description: '一边可视化编辑，一边生成方便复制的富文本标签。',
    href: 'https://olafifi.github.io/rich-text-translator/',
    tags: ['TEXT', 'SYNC'],
    mascotAsset: asset('danbai/praise-sun.png'),
    accent: 'pink'
  }
];

export const GAMES: GameItem[] = [
  {
    id: '2048',
    name: '2048',
    mascotAsset: asset('danbai/blank.png'),
    modulePath: asset('games/2048/index.html'),
    preferredWidth: 460,
    preferredHeight: 620,
    inputMode: 'both'
  },
  {
    id: 'sudoku',
    name: '数独',
    mascotAsset: asset('danbai/eye-roll.png'),
    modulePath: asset('games/sudoku/index.html'),
    preferredWidth: 560,
    preferredHeight: 680,
    inputMode: 'both'
  },
  {
    id: 'tetris',
    name: '俄罗斯方块',
    mascotAsset: asset('danbai/rage.png'),
    modulePath: asset('games/tetris/index.html'),
    preferredWidth: 520,
    preferredHeight: 700,
    inputMode: 'both'
  },
  {
    id: 'snake',
    name: '贪吃蛇',
    mascotAsset: asset('danbai/tempted.png'),
    modulePath: asset('games/snake/index.html'),
    preferredWidth: 600,
    preferredHeight: 650,
    inputMode: 'both'
  },
  {
    id: 'merge-danbai',
    name: '合成大蛋白',
    mascotAsset: asset('danbai/expect.png'),
    modulePath: asset('games/merge-danbai/index.html'),
    preferredWidth: 560,
    preferredHeight: 700,
    inputMode: 'both'
  }
];
