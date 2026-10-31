import type { Monster } from './types'

// Mirrors the @theme block in src/index.css, for places CSS can't reach (Leaflet, canvas).
export const colors = {
  night: '#0b0a14',
  dusk: '#13111f',
  panel: '#1a1730',
  panelHi: '#262142',
  edge: '#3a3360',
  bone: '#f4ecd8',
  ash: '#9c94b8',
  moon: '#f6e7a1',
  shadow: '#5b3fa8',
  sun: '#ffcf3f',
} as const

export const accents: Record<Monster, { main: string; dark: string }> = {
  vampire: { main: '#d7263d', dark: '#7a0f1f' },
  banshee: { main: '#9ad1ff', dark: '#3b6c9c' },
  hob: { main: '#ff7a1a', dark: '#8f3a05' },
  zombie: { main: '#a8d84e', dark: '#4d6b1a' },
}

export interface MonsterInfo {
  id: Monster
  name: string
  curse: string
  need: string
  route: string
}

export const monsters: MonsterInfo[] = [
  {
    id: 'vampire',
    name: 'Vampire',
    curse: 'Burns in sunlight',
    need: 'Light sensitivity, migraines, harsh weather',
    route: '/vampire',
  },
  {
    id: 'banshee',
    name: 'Banshee',
    curse: 'Wails before doom arrives',
    need: 'Deadline pileups and crunch weeks',
    route: '/banshee',
  },
  {
    id: 'hob',
    name: 'Hob',
    curse: 'Cooks whatever scraps are left',
    need: 'Budget meals around a packed timetable',
    route: '/hob',
  },
  {
    id: 'zombie',
    name: 'Zombie',
    curse: 'Shuffling around Robarts since midterms',
    need: 'Burnout and exam week',
    route: '/zombie',
  },
]
