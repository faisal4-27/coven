import type { Monster } from '../../shared/types'
import { monsters } from '../../shared/tokens'
import { EmptyState, PageHeader, PixelLink } from '../../shared/ui'

/** Mount point for features that haven't landed yet. Swap the route element in App.tsx when yours is ready. */
export function ComingSoon({ monster }: { monster: Monster }) {
  const info = monsters.find((m) => m.id === monster)!
  return (
    <div className="min-h-dvh">
      <PageHeader monster={monster} title={info.name} subtitle={info.curse} />
      <EmptyState title="Still rising from the grave">
        <p>{info.name} mode is being stitched together. Check back after the integration check.</p>
        <PixelLink to="/" className="mt-6" variant="ghost" accent={monster}>
          Back to the coven
        </PixelLink>
      </EmptyState>
    </div>
  )
}
