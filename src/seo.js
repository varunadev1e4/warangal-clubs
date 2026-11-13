import { useEffect } from 'react'
import { supabase } from './supabase'

// Adds Google "Event" structured data for the upcoming events, so they can appear as event
// results in search. Only for real data: the demo content is never published to search engines.
export function useEventStructuredData(events) {
  useEffect(() => {
    const id = 'ld-events'
    const existing = document.getElementById(id)
    if (!supabase || !events.length) {
      if (existing) existing.remove()
      return
    }

    const graph = events.slice(0, 20).map(e => ({
      '@type': 'Event',
      name: e.title,
      startDate: new Date(e.starts_at).toISOString(),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: e.location || 'Warangal',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Warangal',
          addressRegion: 'Telangana',
          addressCountry: 'IN',
        },
      },
      ...(e.description ? { description: e.description } : {}),
      ...(e.poster_url ? { image: [e.poster_url] } : {}),
      ...(e.clubs ? { organizer: { '@type': 'Organization', name: e.clubs.name } } : {}),
      ...(e.link ? { url: e.link } : {}),
    }))

    const el = existing || Object.assign(document.createElement('script'), { type: 'application/ld+json', id })
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    if (!existing) document.head.appendChild(el)
  }, [events])
}
