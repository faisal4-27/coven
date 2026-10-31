export type PixelGrid = readonly string[];
export type PixelColorMap = Readonly<Record<string, string>>;

export const PIXEL_PALETTE: PixelColorMap = {
  o: '#2a1738',
  w: '#f4efe6',
  y: '#f6d04d',
  Y: '#d89b2a',
  r: '#e0453a',
  R: '#a82a2e',
  g: '#55c26b',
  G: '#2f8a4a',
  b: '#a8693a',
  B: '#6b3f22',
  p: '#c98ad0',
  P: '#9a5fa8',
  c: '#f3dfb0',
  t: '#d9a66a',
  n: '#f08a2e',
  u: '#7a6ad8',
  l: '#d8d0e6',
  d: '#4a3a5e',
};

export const WITCH_HAT_SPRITE: PixelGrid = [
  '.....oo.....',
  '....ouuo....',
  '...ouuuuo...',
  '..ouuyyuuo..',
  'oooooooooooo',
  '.oddddddddo.',
  '..ogooooggo.',
  '..ogoggogo..',
  '..oggggggo..',
  '.ouugggguuo.',
  '..oooooooo..',
];

export const CHECK_BADGE_SPRITE: PixelGrid = [
  '......gg',
  '.....ggG',
  '....ggG.',
  'g..ggG..',
  'ggggG...',
  '.ggG....',
  '..G.....',
];

export const SPARKLE_PIXEL_SPRITE: PixelGrid = [
  '...y...',
  '...y...',
  '..yyy..',
  'yyywyyy',
  '..yyy..',
  '...y...',
  '...y...',
];

export const POUCH_PIXEL_SPRITE: PixelGrid = [
  '..oooo..',
  '.oyyyyo.',
  '..oooo..',
  '.otttto.',
  'ottwwtto',
  'ottyytto',
  '.otttto.',
  '..oooo..',
];

