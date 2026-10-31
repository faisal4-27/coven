import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PixelSprite } from './PixelSprite'
import { monsterSprites } from '../sprites'
import { accents } from '../tokens'
import type { Monster } from '../types'
import { AccountButton } from '../auth'

interface Props {
  monster: Monster
  title: string
  subtitle?: string
  children?: ReactNode
}

export function PageHeader({ monster, title, subtitle, children }: Props) {
  return (
    <header className="flex items-center gap-3 border-b-4 border-edge bg-dusk py-3 pl-4 pr-20 sm:gap-4 sm:pl-6">
      <Link to="/" className="font-display text-2xl tracking-widest text-bone hover:text-[var(--accent)]" aria-label="Coven home">
        COVEN
      </Link>
      <span className="hidden h-8 w-1 bg-edge sm:block" aria-hidden />
      <PixelSprite sprite={monsterSprites[monster]} scale={2} className="hidden shrink-0 sm:block" />
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl leading-tight sm:text-2xl" style={{ color: accents[monster].main }}>
          {title}
        </h1>
        {subtitle && <p className="hidden truncate text-lg leading-tight text-ash sm:block">{subtitle}</p>}
      </div>
      {children}
      <AccountButton />
    </header>
  )
}
