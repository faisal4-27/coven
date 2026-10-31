import { mirror, paint, type SpriteDef } from './build'

const base = mirror([
  '............',
  '........kkkk',
  '......kkhhhh',
  '.....khhhhhh',
  '....khhhhhhh',
  '....khhssssh',
  '....khskksss',
  '....ksseesss',
  '....kSssssss',
  '....kSssssss',
  '....kSsssmmm',
  '..o.kSsssmwm',
  '..ookkSsssws',
  '..oookkSssss',
  '..oooookkkkk',
  '..kcccrRRoog',
  '.kccccrRRooo',
  '.kccccrRRooo',
  'kcccccrRRooo',
  'kcccccrRRRoo',
  'kcccccrrhhhh',
  'kcccccrrhhhh',
  'kccccccrhhh.',
  '.kcccccr.kk.',
  '..kc.kcr....',
  '...k..k.....',
])

const blink = paint(base, [[4, 7, 'ksskksssssskkssk']])
const smirk = paint(base, [[15, 10, 'k']])

export const vampire: SpriteDef = {
  fps: 3,
  palette: {
    k: '#050409',
    h: '#1c1426',
    s: '#e8dccb',
    S: '#b9a9c4',
    e: '#ff3355',
    w: '#ffffff',
    m: '#5a0d1a',
    c: '#1e1530',
    r: '#d7263d',
    R: '#7a0f1f',
    o: '#f4ecd8',
    g: '#f6c945',
  },
  frames: [base, base, base, blink, base, smirk],
}
