import { mirror, paint, type SpriteDef } from './build'

const body = mirror([
  '........kkkk',
  '......kktttt',
  '.....kttttTt',
  '....kttTtttt',
  '....kttttttt',
  '.....kkkkkkk',
  '.....kgggggg',
  'kk...kgggggg',
  'kgGkgekggggg',
  '..kkgggggggG',
  '....kggkwkwk',
  '.....kggkkkk',
  '......kkaaaa',
  '....kgkaaaaa',
  '...kggkaaaaa',
  '...kgkaaaAaa',
  '....kkaaaaaa',
  '.....kaaaaaa',
  '.....kAAAAAA',
  '.......kGGk.',
  '......kkkkk.',
])

// A wooden spoon held up on the right, with a little ember floating off it.
const base = paint(body, [
  [19, 5, 'kTk'],
  [19, 6, 'TTT'],
  [19, 7, 'kTk'],
  [20, 8, 'A'],
  [20, 9, 'A'],
  [20, 10, 'A'],
  [20, 11, 'A'],
  [19, 12, 'gA'],
  [19, 13, 'gk'],
])

const ember = paint(base, [[21, 3, 'f'], [22, 2, 'F']])
const blink = paint(ember, [[5, 8, 'kk'], [17, 8, 'kk']])

export const hob: SpriteDef = {
  fps: 3,
  palette: {
    k: '#1a0d05',
    t: '#f4ecd8',
    T: '#c9bca0',
    g: '#b0855a',
    G: '#7d5a39',
    e: '#ffcf3f',
    w: '#f4ecd8',
    a: '#ff7a1a',
    A: '#8f3a05',
    f: '#ffcf3f',
    F: '#ff7a1a',
  },
  frames: [base, ember, base, blink],
}
