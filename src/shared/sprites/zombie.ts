import { mirror, paint, type SpriteDef } from './build'

const body = mirror([
  '............',
  '.......kk.kk',
  '......khkkhh',
  '.....khhhhhh',
  '....khhhhhhh',
  '....khzhhhzz',
  '....kzzzzzzz',
  '....kzeepzzz',
  '....kzZZzzzz',
  '....kzzzzzzZ',
  '....kZzzzmmm',
  '....kZzzzzzz',
  '.....kZZZZZZ',
  '....kuuUuuuu',
  '...kuuuuuuuu',
  '..kuuuuuuuww',
  '..kuuUuuuwww',
  '..kuuUuuuuww',
  '..kzkuuuuuuu',
  '..kkkuuuuuuu',
  '....kjjjjjjj',
  '....kjjjjjk.',
  '....kjjjjjk.',
  '...kkkkkkkk.',
])

// Right arm reaches out, the left one dangles. A stitch across one cheek.
const base = paint(body, [
  [20, 13, 'kkkkkk'],
  [19, 14, 'uuuuzzk'],
  [19, 15, 'uuuuzzk'],
  [20, 16, 'kkkkkk'],
  [19, 18, 'k...'],
  [19, 19, 'k..'],
  [15, 9, 'sks'],
])

const reach = paint(base, [
  [20, 13, '......'],
  [20, 14, 'kkkkkk'],
  [19, 15, 'uuuuzzk'],
  [19, 16, 'uuuuzzk'],
  [20, 17, 'kkkkkk'],
])

const look = paint(base, [[6, 7, 'epe'], [15, 7, 'epe']])

export const zombie: SpriteDef = {
  fps: 2,
  palette: {
    k: '#0f140a',
    z: '#a8d84e',
    Z: '#6f9a2c',
    h: '#3b2a1a',
    e: '#f4ecd8',
    p: '#d7263d',
    m: '#2a1010',
    s: '#2a1010',
    u: '#1e3765',
    U: '#2f5496',
    w: '#f4ecd8',
    j: '#3c4a6b',
  },
  frames: [base, reach, base, look],
}
