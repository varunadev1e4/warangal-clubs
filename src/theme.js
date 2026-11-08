// Colour is information here: every club category has one colour,
// used for the stripe on an event and the tile on a club.

export const SUN = '#F0A800' // general city events

export function categoryColor(category) {
  const c = (category || '').toLowerCase()
  if (!c || c === 'general') return SUN
  if (/book|read|writ|poet/.test(c)) return '#B3125A' // pink, like bathukamma flowers
  if (/trek|outdoor|hike|advent|nature|camp/.test(c)) return '#1F7A4D' // fort-side green
  if (/run|fit|sport|cycl|yoga|gym|football|cricket|swim/.test(c)) return '#2455A4' // lake blue
  if (/art|music|dance|film|photo|theat|craft|culture/.test(c)) return '#6B3FA0' // violet
  return '#4B5B5E' // granite
}

// "Warangal Book Club" -> "B", "Warangal Trek Club" -> "T", "Night Sky Gazers" -> "NS"
export function initials(name = '') {
  const words = name.split(/\s+/).filter(w => w && !/^(warangal|club|the|of|and)$/i.test(w))
  const use = words.length ? words : name.split(/\s+/).filter(Boolean)
  if (use.length === 1) return use[0].slice(0, 2).replace(/^./, s => s.toUpperCase())
  return use.slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
