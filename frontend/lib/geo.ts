// Lahore's rough bounding box, used to place real lat/lng points onto the
// abstract map panels as left/top percentages (no external map tiles are
// reachable from this sandbox, so we plot a faithful, if simplified, view).
export const LAHORE_BBOX = {
  minLat: 31.35,
  maxLat: 31.62,
  minLng: 74.18,
  maxLng: 74.5,
}

export function severityTone(severity: string): 'blue' | 'green' | 'amber' | 'rose' {
  switch (severity) {
    case 'critical':
      return 'rose'
    case 'high':
      return 'amber'
    case 'medium':
      return 'blue'
    default:
      return 'green'
  }
}

export function severityDot(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500'
    case 'high':
      return 'bg-amber-500'
    case 'medium':
      return 'bg-cyan-400'
    default:
      return 'bg-teal-400'
  }
}

export function severityColorHex(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#e11d48'
    case 'high':
      return '#d97706'
    case 'medium':
      return '#22d3ee'
    default:
      return '#2dd4bf'
  }
}

// Most backends (including this one) serialize timestamps as naive UTC —
// e.g. Python's `datetime.isoformat()` produces "2026-08-31T03:58:00" with no
// trailing 'Z' or +offset. Per the JS spec, a date-time string with no
// timezone designator is parsed as the *browser's local time*, not UTC — so
// on a machine outside Asia/Karachi the same reading silently shows the wrong
// hour, and even a `timeZone: 'Asia/Karachi'` conversion downstream never
// actually applies. Assume UTC whenever no offset is present so every
// timestamp converts correctly for any viewer, anywhere.
export function parseApiDate(value: string): Date {
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(value)
  return new Date(hasTimezone ? value : `${value}Z`)
}

export function timeAgo(iso: string): string {
  const then = parseApiDate(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return parseApiDate(iso).toLocaleDateString()
}

export function titleCase(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}