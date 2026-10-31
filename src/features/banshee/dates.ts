/** Calendar dates stay local; never derive a day with UTC slicing. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseDay(value: string): Date {
  const date = new Date(`${value}T12:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(+date) || dayKey(date) !== value) throw new Error(`Invalid date: ${value}`)
  return date
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function monday(value: string): string {
  const date = parseDay(value)
  return dayKey(addDays(date, -((date.getDay() + 6) % 7)))
}

export function atTime(day: string, time: string): Date {
  parseDay(day)
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Use a valid 24-hour time.')
  return new Date(`${day}T${time}:00`)
}

export function shortDate(day: string): string {
  return parseDay(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
