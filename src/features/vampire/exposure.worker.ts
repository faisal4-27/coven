// Computes sun exposure off the main thread. Requests ("want") jump the queue; prefetches fill idle time.
import { computeExposure } from './exposure'
import { loadMassing } from './shadows'

export type ToWorker = { type: 'want'; slot: number } | { type: 'prefetch'; slots: number[] }

const queue: number[] = []
const done = new Set<number>()
let running = false

async function pump() {
  if (running) return
  running = true
  const footprints = await loadMassing()
  while (queue.length) {
    const slot = queue.shift()!
    if (done.has(slot)) continue
    done.add(slot)
    const data = computeExposure(footprints, slot)
    postMessage(data, { transfer: [data.shadowCoords.buffer, data.shadowOffsets.buffer, ...data.sunny.map((s) => s.buffer)] })
    // Yield so a fresh "want" can jump ahead of the remaining prefetches.
    await new Promise((r) => setTimeout(r, 0))
  }
  running = false
}

onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data
  if (msg.type === 'want') {
    if (!done.has(msg.slot)) queue.unshift(msg.slot)
  } else {
    for (const s of msg.slots) if (!done.has(s) && !queue.includes(s)) queue.push(s)
  }
  void pump()
}
