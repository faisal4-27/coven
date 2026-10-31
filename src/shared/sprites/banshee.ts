import { mirror, paint, type SpriteDef } from './build'

const base = mirror([
  '............',
  '........kkkk',
  '......kkhhhh',
  '.....khhhhhh',
  '....khhhhhhh',
  '....khhwwwww',
  '...khhwwwwww',
  '...khhweewww',
  '...khhweewww',
  '...khHwwwwww',
  '...khHwwwwmm',
  '..khhHwwwwmm',
  '..khhHHwwwww',
  '..khHHbbbbbb',
  '.khHbbbbbbbb',
  'khhHbbBbbbbb',
  'khHkbbBbbbbb',
  'kHk.kbBbbbbb',
  'kk..kbBbbbbb',
  '....kbbBbbbb',
  '.....kbBbbbb',
  '.....kbbBbbb',
  '......kbbBbb',
  '......kb.kbb',
  '.......k..kb',
  '..........k.',
])

// Wail: mouth stretches, tail whips the other way.
const wail = paint(base, [
  [10, 9, 'wmmmm'],
  [8, 22, '..kbbBbk'],
  [8, 23, '.kbbk.kb'],
  [7, 24, 'kbk...k.k'],
  [6, 25, 'k.........k'],
])

export const banshee: SpriteDef = {
  fps: 3,
  palette: {
    k: '#1b2a44',
    w: '#dff1ff',
    b: '#9ad1ff',
    B: '#3b6c9c',
    h: '#c9d6ee',
    H: '#8796b8',
    e: '#0b0a14',
    m: '#0b0a14',
  },
  frames: [base, base, wail, base],
}
