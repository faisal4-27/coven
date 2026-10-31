import { useCoven } from '../../shared/store'
import { Card, MoonIcon, PixelLink } from '../../shared/ui'
import { detectCrunchWeeks } from './logic'
import { dayKey, shortDate } from './dates'

export function CrunchPreview() {
  const items = useCoven(state => state.assessments)
  const now = useCoven(state => state.now)
  let next
  try { next = detectCrunchWeeks(items).find(week => week.phase === 'full' && week.assessments.some(item => item.date >= dayKey(now))) }
  catch { /* The full page provides validation and editing for malformed shared data. */ }
  return <Card accent="banshee" className="flex flex-col gap-4">
    <div className="flex items-center gap-4"><MoonIcon phase={next ? 'full' : 'waxing-crescent'} /><h2 className="font-display text-2xl text-banshee">Crunch moons</h2></div>
    <p>{next ? `${next.load}% combined grade weight · week of ${shortDate(next.weekStart)}. Make room before the moon fills.` : items.length ? 'No full crunch moon ahead. Keep your study time steady.' : 'See deadline pileups coming. Add your first course to reveal the moons.'}</p>
    <PixelLink to="/banshee" accent="banshee" variant="ghost">Open Banshee</PixelLink>
  </Card>
}
