// Helpers for authoring pixel sprites as text grids. '.' is transparent.

export interface SpriteDef {
  frames: string[][]
  palette: Record<string, string>
  /** Frame rate for idle animation. */
  fps?: number
}

const reverse = (s: string) => [...s].reverse().join('')

/** Mirror left-half rows into full symmetric rows. */
export function mirror(half: string[]): string[] {
  return half.map((row) => row + reverse(row))
}

/** Overwrite characters starting at (x, y). Spaces in `str` leave pixels untouched. */
export function paint(rows: string[], patches: [x: number, y: number, str: string][]): string[] {
  const out = rows.map((r) => [...r])
  for (const [x, y, str] of patches) {
    const row = out[y] ?? (out[y] = [])
    ;[...str].forEach((ch, i) => {
      if (ch === ' ') return
      while (row.length < x + i) row.push('.')
      row[x + i] = ch
    })
  }
  return out.map((r) => r.join(''))
}
