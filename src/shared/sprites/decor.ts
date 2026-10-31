import { mirror, type SpriteDef } from './build'

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
