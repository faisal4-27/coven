import { mirror, paint, type SpriteDef } from './build'

export const bat: SpriteDef = {
  fps: 4,
  palette: { k: '#050409', e: '#d7263d' },
  frames: [
    mirror(['k.......', 'kk....k.', 'kkk..kkk', 'kkkkkkek', '.kkkkkkk', '..k.kkkk', '......kk', '........']),
    mirror(['........', '......k.', '......kk', '..kkkkek', '.kkkkkkk', 'kkk.kkkk', 'kk....kk', 'k.......']),
  ],
}

export const tombstone: SpriteDef = {
  palette: { k: '#0b0a14', g: '#5c5778', G: '#3a3653', m: '#2d4a1e', M: '#4d6b1a' },
  frames: [
    mirror([
      '...kkkkk',
      '.kkggggg',
      '.kgggggg',
      'kggggggG',
      'kggggGGG',
      'kggggggG',
      'kggggggG',
      'kggggggg',
      'kggggggg',
      'kGgggggg',
      'kGgggggg',
      'mMmmMmMm',
    ]),
  ],
}

export const sun: SpriteDef = {
  palette: { y: '#ffcf3f', Y: '#ff9f1a', w: '#fff3c4' },
  frames: [
    mirror([
      '......y',
      '.y.....',
      '...YYYY',
      '..YYyyy',
      '..Yyyww',
      'y.Yyyww',
      '..Yyyww',
      '..YYyyy',
      '...YYYY',
      '.y.....',
      '......y',
    ]),
  ],
}

const speaker = ['....b.......', '...bb.......', '..bbb.......', 'bbbbb.......', 'bbbbb.......', 'bbbbb.......', 'bbbbb.......', '..bbb.......', '...bb.......', '....b.......']

export const speakerOn: SpriteDef = {
  palette: { b: '#f4ecd8' },
  frames: [paint(speaker, [[8, 1, 'b'], [9, 2, 'b'], [7, 3, 'b..b'], [8, 4, 'b.b'], [8, 5, 'b.b'], [7, 6, 'b..b'], [9, 7, 'b'], [8, 8, 'b']])],
}

export const speakerOff: SpriteDef = {
  palette: { b: '#9c94b8', r: '#d7263d' },
  frames: [paint(speaker, [[6, 3, 'r...r'], [7, 4, 'r.r'], [8, 5, 'r'], [7, 6, 'r.r'], [6, 7, 'r...r']])],
}
