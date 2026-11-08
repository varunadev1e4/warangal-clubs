// All dates are shown in Indian time, whatever the viewer's device says.
const TZ = 'Asia/Kolkata'

const dayKey = d => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ })

export const timeStr = d =>
  new Date(d)
    .toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()

export const dayNum = d => new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric' })

export const weekday = d =>
  new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'short' })

export const monthYear = d =>
  new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, month: 'long', year: 'numeric' })

export const longDate = d =>
  new Date(d).toLocaleDateString('en-IN', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

export function whenLabel(d) {
  const now = new Date()
  const key = dayKey(d)
  if (key === dayKey(now)) return 'Today'
  if (key === dayKey(new Date(now.getTime() + 864e5))) return 'Tomorrow'
  return longDate(d)
}
