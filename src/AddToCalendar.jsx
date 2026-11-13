import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Events have a start time but no end time, so the calendar entry runs for 2 hours.
const DURATION_MS = 2 * 3600e3

// 2026-11-14T05:00:00.000Z -> 20261114T050000Z
const stamp = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '')

function details(e) {
  const host = e.clubs ? `Hosted by ${e.clubs.name}.` : ''
  return [e.description, host, window.location.origin].filter(Boolean).join('\n\n')
}

export function googleCalendarUrl(e) {
  const start = new Date(e.starts_at)
  const end = new Date(start.getTime() + DURATION_MS)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: clip(details(e), 1500),
  })
  if (e.location) p.set('location', e.location)
  return 'https://calendar.google.com/calendar/render?' + p.toString()
}

// iCalendar text rules: escape \ ; , and newlines
const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

export function icsContent(e) {
  const start = new Date(e.starts_at)
  const end = new Date(start.getTime() + DURATION_MS)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Warangal Clubs//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@warangal-clubs`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(details(e))}`,
  ]
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

const fileName = e => (e.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event'

// variant "button" = used in the hero; "link" = used in the event rows
export default function AddToCalendar({ event, variant = 'link' }) {
  const [open, setOpen] = useState(false)
  const [flip, setFlip] = useState(false) // open towards the left when there isn't room on the right
  const ref = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return setFlip(false)
    const r = menuRef.current.getBoundingClientRect()
    setFlip(r.right > window.innerWidth - 12)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = ev => { if (ref.current && !ref.current.contains(ev.target)) setOpen(false) }
    const onKey = ev => { if (ev.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const ics = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent(event))

  return (
    <div className="cal" ref={ref}>
      <button
        type="button"
        className={variant === 'button' ? 'btn btn--ghost' : 'textlink cal__toggle'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(o => !o)}
      >
        Add to calendar
      </button>
      {open && (
        <div className={'cal__menu' + (flip ? ' cal__menu--right' : '')} role="menu" ref={menuRef}>
          <a role="menuitem" href={googleCalendarUrl(event)} target="_blank" rel="noreferrer"
            onClick={() => setOpen(false)}>
            Google Calendar
          </a>
          <a role="menuitem" href={ics} download={`${fileName(event)}.ics`} onClick={() => setOpen(false)}>
            Apple, Outlook and others (.ics file)
          </a>
        </div>
      )}
    </div>
  )
}
