// Landing page scenery: pixel moon and the St. George skyline. All shapes are [x, y, w, h] in sprite pixels.
import { colors } from '../shared/tokens'

type R = [number, number, number, number]

/** Stack of centred rows narrowing upwards, for roofs and spires. */
function stepped(cx: number, baseY: number, widths: number[], rowH = 1): R[] {
  return widths.map((w, i) => [cx - w / 2, baseY - (i + 1) * rowH, w, rowH])
}

const W = 400
const H = 90
/** The hand-drawn campus is 240 wide; it sits centred and generated rooftops fill the sides. */
const OFFSET = 80

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function rooftops(seed: number, from: number, to: number, minH: number, maxH: number): R[] {
  const rnd = seeded(seed)
  const out: R[] = []
  for (let x = from; x < to; ) {
    const w = 6 + Math.floor(rnd() * 12)
    const h = minH + Math.floor(rnd() * (maxH - minH))
    out.push([x, H - h, w, h])
    if (rnd() > 0.6) out.push([x + Math.floor(w / 2) - 1, H - h - 3, 2, 3])
    x += w + Math.floor(rnd() * 3)
  }
  return out
}

const farSides: R[] = [...rooftops(11, 0, OFFSET + 10, 14, 44), ...rooftops(23, W - OFFSET - 10, W, 14, 44)]
const nearSides: R[] = [...rooftops(5, 0, OFFSET, 6, 22), ...rooftops(9, W - OFFSET, W, 6, 22)]

// Far layer: downtown Toronto behind campus, CN Tower included.
const far: R[] = [
  [150, 52, 10, 38], [162, 46, 8, 44], [172, 56, 12, 34], [186, 40, 9, 50], [214, 50, 14, 40], [230, 58, 10, 32],
  [0, 62, 12, 28], [14, 56, 8, 34], [24, 66, 10, 24],
  // CN Tower
  [201, 30, 3, 60], [199, 26, 7, 4], [200, 24, 5, 2], [201.5, 6, 1, 18], [198, 30, 1, 2], [205, 30, 1, 2],
]

// Near layer: St. George campus.
const near: R[] = [
  // Robarts, the concrete peacock
  ...stepped(36, 90, [56, 56, 54, 54, 52, 52, 50, 50, 48, 46, 46, 44, 42, 40, 38, 36, 34, 30, 26], 2),
  [22, 44, 4, 8], [46, 44, 4, 8], [33, 46, 6, 6],
  // University College: long base, central Norman tower, corner turrets
  [70, 62, 58, 28], [70, 56, 6, 6], [122, 56, 6, 6], [70, 54, 2, 2], [74, 54, 2, 2], [122, 54, 2, 2], [126, 54, 2, 2],
  [92, 38, 14, 24], ...stepped(99, 38, [14, 12, 10, 8, 6, 4, 2]),
  [84, 58, 4, 4], [110, 58, 4, 4],
  // Hart House and Soldiers' Tower
  [134, 66, 34, 24], [134, 63, 34, 3],
  [146, 30, 8, 36], ...stepped(150, 30, [8, 6, 6, 4, 4, 2, 2, 2]), [149.5, 18, 1, 4],
  // Trees along King's College Circle
  [56, 72, 10, 18], [54, 76, 14, 8], [130, 74, 6, 16], [168, 72, 10, 18], [166, 76, 14, 6],
]

// Lit windows, some of them flicker.
const windows: [number, number, boolean][] = [
  [28, 60, false], [36, 56, true], [44, 64, false], [32, 72, false], [40, 76, true],
  [76, 68, false], [82, 68, true], [88, 74, false], [110, 68, false], [116, 74, true], [122, 68, false],
  [97, 44, false], [101, 50, true],
  [138, 72, false], [144, 72, true], [158, 72, false], [162, 78, false], [149, 36, true],
  [153, 56, false], [165, 50, false], [189, 48, true], [175, 62, false], [218, 58, false], [220, 70, true],
]

export function Skyline({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden
      className={`block w-full ${className}`}
    >
      <g fill="#1d1934">
        {farSides.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} />
        ))}
      </g>
      <g fill="#07060d">
        {nearSides.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} />
        ))}
      </g>
      <g transform={`translate(${OFFSET} 0)`}>
      <g fill="#1d1934">
        {far.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} />
        ))}
      </g>
      <rect x={201} y={27} width={3} height={1} fill={colors.ash} />
      <rect x={201.5} y={6} width={1} height={1} className="anim-twinkle" fill="#d7263d" />
      <g fill="#07060d">
        {near.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} />
        ))}
      </g>
      {windows.map(([x, y, flicker], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={2}
          height={2}
          fill={colors.moon}
          opacity={0.85}
          className={flicker ? 'anim-twinkle' : undefined}
          style={flicker ? { animationDelay: `${(i % 5) * 0.7}s` } : undefined}
        />
      ))}
      </g>
      <rect x={0} y={86} width={W} height={4} fill="#07060d" />
    </svg>
  )
}

const craters: R[] = [[8, 9, 4, 3], [17, 6, 3, 3], [19, 15, 5, 4], [10, 19, 3, 3], [6, 14, 2, 2], [15, 22, 3, 2]]

export function BigMoon({ size = 28, scale = 7 }: { size?: number; scale?: number }) {
  const r = size / 2
  let body = ''
  let rim = ''
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r
      const dy = y + 0.5 - r
      if (dx * dx + dy * dy > r * r) continue
      const px = `M${x} ${y}h1v1h-1z`
      if (dx * dx + dy * dy > (r - 2) * (r - 2) && dx + dy > 4) rim += px
      else body += px
    }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size * scale}
      height={size * scale}
      shapeRendering="crispEdges"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 32px rgba(246, 231, 161, 0.35))' }}
      className="h-auto w-full max-w-[45vw] sm:w-auto"
    >
      <path d={body} fill={colors.moon} />
      <path d={rim} fill="#d9c77e" />
      {craters.map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="#e3cf84" />
          <rect x={x} y={y} width={w} height={1} fill="#cdb96e" />
        </g>
      ))}
    </svg>
  )
}
