export { banshee } from './banshee'
export { bat, sun, tombstone } from './decor'
export { hob } from './hob'
export { vampire } from './vampire'
export { zombie } from './zombie'
export type { SpriteDef } from './build'

import type { Monster } from '../types'
import type { SpriteDef } from './build'
import { banshee } from './banshee'
import { hob } from './hob'
import { vampire } from './vampire'
import { zombie } from './zombie'

export const monsterSprites: Record<Monster, SpriteDef> = { vampire, banshee, hob, zombie }
