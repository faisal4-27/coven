import type { ReactNode } from 'react'
import { PixelSprite } from './PixelSprite'
import { bat, tombstone } from '../sprites'

export function Loading({ label = 'Summoning…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 p-8 text-ash">
      <div className="anim-flap">
        <PixelSprite sprite={bat} scale={4} />
      </div>
      <p className="text-xl">{label}</p>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <PixelSprite sprite={tombstone} scale={5} />
      <h2 className="font-display text-2xl">{title}</h2>
      {children && <div className="max-w-md text-lg text-ash">{children}</div>}
    </div>
  )
}
