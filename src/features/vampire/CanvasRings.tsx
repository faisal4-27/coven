import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'

type Ring = [number, number][]

/**
 * Extra canvas around the viewport, so short pans don't reveal an unpainted edge before moveend. Same as
 * Leaflet's renderer default; bigger multiplies pixels to clear and fill on retina screens.
 */
const PAD = 0.1

interface Style {
  fill: string
  stroke?: string
}

interface Drawn {
  center: L.LatLng
  zoom: number
}

/** Leaflet keeps this private; it's what its own canvas renderer uses to follow zoom animations. */
type MapWithOrigin = L.Map & { _getNewPixelOrigin(center: L.LatLng, zoom: number): L.Point }

function draw(map: L.Map, canvas: HTMLCanvasElement, rings: Ring[], style: Style): Drawn {
  const size = map.getSize()
  const origin = map.containerPointToLayerPoint([-size.x * PAD, -size.y * PAD])
  const w = Math.round(size.x * (1 + 2 * PAD))
  const h = Math.round(size.y * (1 + 2 * PAD))
  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
  }
  L.DomUtil.setPosition(canvas, origin)
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const drawn = { center: map.getCenter(), zoom: map.getZoom() }
  if (!rings.length) return drawn

  // Web Mercator inlined (Leaflet's EPSG:3857), so the loop allocates nothing per point.
  const scale = 256 * 2 ** map.getZoom()
  const pixelOrigin = map.getPixelOrigin()
  const ox = pixelOrigin.x + origin.x
  const oy = pixelOrigin.y + origin.y
  const k = Math.PI / 360
  ctx.beginPath()
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [lat, lng] = ring[i]
      const x = scale * (lng / 360 + 0.5) - ox
      const y = scale * (0.5 - Math.log(Math.tan(Math.PI / 4 + lat * k)) / (2 * Math.PI)) - oy
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    // No closePath(): rings already end on their first point and fill() closes subpaths itself.
    // In Chrome, closePath on a path with ~1,200 subpaths was most of a 200 ms zoom stall.
  }
  ctx.fillStyle = style.fill
  ctx.fill('nonzero')
  if (style.stroke) {
    ctx.strokeStyle = style.stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }
  return drawn
}

/**
 * Draws many polygons as one path on one canvas. Leaflet's Polygon layer re-projects ~1,200 rings through
 * LatLng objects and per-layer bookkeeping on every update and zoom, which stalled the time slider. One path
 * filled with the nonzero rule also renders overlapping shadows as a clean union.
 */
export function CanvasRings({ pane, zIndex, rings, fill, stroke }: { pane: string; zIndex: number; rings: Ring[] } & Style) {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const latest = useRef({ rings, style: { fill, stroke } })
  const drawn = useRef<Drawn | null>(null)

  useEffect(() => {
    const el = map.getPane(pane) ?? map.createPane(pane)
    el.style.zIndex = String(zIndex)
    el.style.pointerEvents = 'none'
    const canvas = L.DomUtil.create('canvas', 'leaflet-zoom-animated', el)
    canvas.style.transformOrigin = '0 0'
    canvasRef.current = canvas
    const redraw = () => {
      drawn.current = draw(map, canvas, latest.current.rings, latest.current.style)
    }
    // Follow zoom animations by scaling the last frame, like Leaflet's own canvas renderer.
    const onZoomAnim = (e: L.ZoomAnimEvent) => {
      const last = drawn.current
      if (!last) return
      const m = map as MapWithOrigin
      const scale = m.getZoomScale(e.zoom, last.zoom)
      const viewHalf = m.getSize().multiplyBy(0.5 + PAD)
      const offset = viewHalf
        .multiplyBy(-scale)
        .add(m.project(last.center, e.zoom))
        .subtract(m._getNewPixelOrigin(e.center, e.zoom))
      L.DomUtil.setTransform(canvas, offset, scale)
    }
    map.on('moveend zoomend resize viewreset', redraw)
    map.on('zoomanim', onZoomAnim)
    redraw()
    return () => {
      map.off('moveend zoomend resize viewreset', redraw)
      map.off('zoomanim', onZoomAnim)
      canvas.remove()
      canvasRef.current = null
    }
  }, [map, pane, zIndex])

  useEffect(() => {
    latest.current = { rings, style: { fill, stroke } }
    if (canvasRef.current) drawn.current = draw(map, canvasRef.current, rings, { fill, stroke })
  }, [map, rings, fill, stroke])

  return null
}
