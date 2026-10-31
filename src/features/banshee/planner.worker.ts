import { createStudyPlan } from './logic'
import type { StudySettings } from './logic'
import type { Assessment, CalendarEvent, CrunchWeek } from '../../shared/types'

self.onmessage = (event: MessageEvent<{ items: Assessment[]; weeks: CrunchWeek[]; busy: CalendarEvent[]; settings: StudySettings }>) => {
  try {
    const { items, weeks, busy, settings } = event.data
    self.postMessage({ plan: createStudyPlan(items, weeks, busy, settings) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Unable to plan study time.' })
  }
}
