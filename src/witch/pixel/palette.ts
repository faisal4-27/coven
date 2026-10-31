export type PixelGrid = readonly string[];
export type PixelColorMap = Readonly<Record<string, string>>;

export const PIXEL_PALETTE: PixelColorMap = {
  o: '#1f0d04',
  w: '#f4efe6',
  y: '#ffb347',
  Y: '#d87a1e',
  r: '#e0453a',
  R: '#a82a2e',
  g: '#55c26b',
  G: '#2f8a4a',
  b: '#a8693a',
  B: '#6b3f22',
  p: '#e08b6b',
  P: '#ad5839',
  c: '#f3dfb0',
  t: '#d9a66a',
  n: '#ff7a1a',
  u: '#e06d1a',
  l: '#e8d5c4',
  d: '#52301b',
};

export const WITCH_HAT_SPRITE: PixelGrid = [
  '.....oo.....',
  '....onno....',
  '...onnnno...',
  '..onnyynno..',
  'oooooooooooo',
  '.oddddddddo.',
  '..onoooonno.',
  '..ononnonno.',
  '..occcccco..',
  '.onnccccnno.',
  '..oooooooo..',
];

export const CHECK_BADGE_SPRITE: PixelGrid = [
  '......nn',
  '.....nnY',
  '....nnY.',
  'n..nnY..',
  'nnnnY...',
  '.nnY....',
  '..Y.....',
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

