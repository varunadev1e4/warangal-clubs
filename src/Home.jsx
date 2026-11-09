import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import * as db from './db'
import Header from './Header'
import { categoryColor, initials, SUN } from './theme'
import { dayNum, weekday, monthYear, timeStr, whenLabel, longDate } from './format'

const categoryOf = e => (e.clubs ? e.clubs.category || 'Club events' : 'General')
const hostOf = e => (e.clubs ? `Hosted by ${e.clubs.name}` : 'City event')

function shareUrl(e) {
  const text =
    `${e.title}\n${longDate(e.starts_at)}, ${timeStr(e.starts_at)}` +
    `${e.location ? ' at ' + e.location : ''}\n${window.location.origin}`
  return 'https://wa.me/?text=' + encodeURIComponent(text)
}

function Gate({ event, loading }) {
  return (
    <section className="gate" aria-label="Next event">
      <div className="gate__opening">
        <div className="gate__inner" key={event ? event.id : loading ? 'loading' : 'empty'}>
          {loading ? (
            <>
              <div className="skeleton skeleton--short" />
              <div className="skeleton skeleton--title" />
              <div className="skeleton" />
            </>
          ) : event ? (
            <>
              <p className="gate__when">
                {whenLabel(event.starts_at)}, {timeStr(event.starts_at)}
              </p>
              <h2 className="gate__title display">{event.title}</h2>
              <p className="gate__meta">
                {hostOf(event)}
                {event.location ? `, at ${event.location}` : ''}
              </p>
              {event.description && <p className="gate__desc">{event.description}</p>}
              <div className="gate__actions">
                <a className="btn" href={shareUrl(event)} target="_blank" rel="noreferrer">
                  Share on WhatsApp
                </a>
                {event.link && (
                  <a className="btn btn--ghost" href={event.link} target="_blank" rel="noreferrer">
                    Event details
                  </a>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="gate__title display">Nothing scheduled yet</h2>
              <p className="gate__desc">
                Clubs post their next events here. Follow a club below to hear about them first.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function EventRow({ e }) {
  const color = e.clubs ? categoryColor(e.clubs.category) : SUN
  return (
    <article className="event" style={{ '--c': color }}>
      <div className="event__date">
        <span className="event__day display">{dayNum(e.starts_at)}</span>
        <span className="event__weekday">{weekday(e.starts_at)}</span>
      </div>
      <div className="event__body">
        <h3 className="event__title">{e.title}</h3>
        <p className="event__meta">
          {timeStr(e.starts_at)}
          {e.location ? `, ${e.location}` : ''}
        </p>
        <p className="event__host">{hostOf(e)}</p>
        {e.description && <p className="event__desc">{e.description}</p>}
      </div>
      <div className="event__actions">
        <a className="textlink" href={shareUrl(e)} target="_blank" rel="noreferrer">
          Share on WhatsApp
        </a>
        {e.link && (
          <a className="textlink" href={e.link} target="_blank" rel="noreferrer">
            Event details
          </a>
        )}
      </div>
    </article>
  )
}

function ClubRow({ c }) {
  const color = categoryColor(c.category)
  const extra = Array.isArray(c.other_links) ? c.other_links.map(l => [l.label || 'Link', l.url]) : []
  const links = [
    ['Instagram', c.instagram_url],
    ['Facebook', c.facebook_url],
    ['WhatsApp', c.whatsapp_url],
    ...extra,
  ].filter(([, url]) => /^https?:\/\//i.test(url || '')) // only real web links
  return (
    <article className="club" style={{ '--c': color }}>
      <div className="club__tile" aria-hidden="true">
        {initials(c.name)}
      </div>
      <div>
        <h3 className="club__name">{c.name}</h3>
        {c.category && <p className="club__cat">{c.category}</p>}
        {c.description && <p className="club__desc">{c.description}</p>}
        {links.length > 0 && (
          <div className="club__links">
            {links.map(([label, url], i) => (
              <a key={label + i} className="linkbtn" href={url} target="_blank" rel="noreferrer">
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

const emptyMessage = { name: '', contact: '', message: '', website: '' }

function ContactSection() {
  const [form, setForm] = useState(emptyMessage)
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')
  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    // Hidden "website" field: real people never fill it, bots do. Pretend it worked.
    if (form.website) return setState('sent')

    let last = 0
    try { last = Number(localStorage.getItem('lastMessageAt') || 0) } catch { /* ignore */ }
    if (Date.now() - last < 60000) {
      setError('You just sent a message. Please wait a minute before sending another.')
      return setState('error')
    }

    setState('sending')
    const { error } = await db.sendMessage({
      name: form.name.trim(),
      contact: form.contact.trim(),
      message: form.message.trim(),
    })
    if (error) {
      setError("Couldn't send your message. Check your connection and try again.")
      return setState('error')
    }
    try { localStorage.setItem('lastMessageAt', String(Date.now())) } catch { /* ignore */ }
    setForm(emptyMessage)
    setState('sent')
  }

  return (
    <section className="contact" id="contact">
      <h2 className="section-title display">Run a club or host an event?</h2>
      <p className="contact__intro">
        Tell us about it and we'll get it listed. Only the site admin can read your message.
      </p>

      {state === 'sent' ? (
        <div className="panel" role="status">
          <h3 className="panel__title display">Message sent</h3>
          <p>Thanks. We'll reach out using the details you gave.</p>
          <div>
            <button className="btn btn--ghost" onClick={() => setState('idle')}>
              Send another message
            </button>
          </div>
        </div>
      ) : (
        <form className="panel" onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="m-name">Your name</label>
              <input id="m-name" required maxLength={100} autoComplete="name" value={form.name}
                onChange={set('name')} />
            </div>
            <div className="field">
              <label htmlFor="m-contact">Phone, email or Instagram</label>
              <input id="m-contact" required minLength={3} maxLength={200} value={form.contact}
                onChange={set('contact')} placeholder="How can we reach you?" />
            </div>
            <div className="field span-2">
              <label htmlFor="m-msg">What would you like us to list?</label>
              <textarea id="m-msg" required rows={4} maxLength={2000} value={form.message}
                onChange={set('message')}
                placeholder="Your club or event, when and where it happens, and any links." />
            </div>
          </div>
          {/* honeypot */}
          <div className="hp" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </label>
          </div>
          {state === 'error' && <p className="error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="btn" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default function Home() {
  const [clubs, setClubs] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [clubCat, setClubCat] = useState('All')

  useEffect(() => {
    async function load() {
      const since = new Date(Date.now() - 2 * 3600e3).toISOString() // keep events that just started
      const [c, e] = await Promise.all([db.listClubs(), db.listEvents(since)])
      const err = c.error || e.error
      if (err) setError(err.message)
      setClubs(c.data || [])
      setEvents(e.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const categories = useMemo(() => {
    const seen = new Map()
    events.forEach(e => {
      const cat = categoryOf(e)
      if (!seen.has(cat)) seen.set(cat, e.clubs ? categoryColor(e.clubs.category) : SUN)
    })
    return [...seen.entries()]
  }, [events])

  // Club categories for the filter chips (case-insensitive, so "books" and "Books" are one chip).
  const clubCats = useMemo(() => {
    const seen = new Map()
    clubs.forEach(c => {
      const name = (c.category || '').trim()
      const key = name.toLowerCase()
      if (name && !seen.has(key)) seen.set(key, name)
    })
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [clubs])

  const q = query.trim().toLowerCase()
  const shownClubs = clubs.filter(c => {
    if (clubCat !== 'All' && (c.category || '').trim().toLowerCase() !== clubCat) return false
    if (!q) return true
    return [c.name, c.category, c.description].some(t => (t || '').toLowerCase().includes(q))
  })
  const clearClubFilters = () => { setQuery(''); setClubCat('All') }

  const shown = filter === 'All' ? events : events.filter(e => categoryOf(e) === filter)
  const [next, ...rest] = shown

  const groups = []
  rest.forEach(e => {
    const m = monthYear(e.starts_at)
    const last = groups[groups.length - 1]
    if (last && last.m === m) last.items.push(e)
    else groups.push({ m, items: [e] })
  })

  return (
    <div className="wrap">
      <Header />

      <section className="hero">
        <h1 className="hero__title display">What's on in Warangal</h1>
        <p className="hero__sub">
          Book clubs, treks, runs and everything else happening in town, in one place.
        </p>
      </section>

      {!supabase && (
        <p className="notice">
          Showing sample content. Add your Supabase keys to <code>.env</code> to see your own
          clubs and events.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          Couldn't load events: {error}. Check your connection and refresh the page.
        </p>
      )}

      {categories.length > 1 && (
        <div className="chips" role="group" aria-label="Filter events by type">
          <button
            className="chip"
            aria-pressed={filter === 'All'}
            style={{ '--c': '#1C2A2D' }}
            onClick={() => setFilter('All')}
          >
            All
          </button>
          {categories.map(([cat, color]) => (
            <button
              key={cat}
              className="chip chip--dot"
              aria-pressed={filter === cat}
              style={{ '--c': color }}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <Gate event={next} loading={loading} />

      {groups.length > 0 && (
        <section>
          <h2 className="section-title display">Coming up</h2>
          {groups.map(g => (
            <div key={g.m}>
              <h3 className="month">{g.m}</h3>
              {g.items.map(e => (
                <EventRow key={e.id} e={e} />
              ))}
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="section-title display">Clubs in town</h2>
        {!loading && clubs.length === 0 && <p className="muted">No clubs listed yet.</p>}

        {clubs.length > 1 && (
          <div className="finder">
            <div className="finder__box">
              <svg className="finder__icon" viewBox="0 0 20 20" aria-hidden="true" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4.5 4.5" />
              </svg>
              <input
                type="search"
                aria-label="Search clubs"
                placeholder="Search clubs by name or topic"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button type="button" className="finder__clear" aria-label="Clear search"
                  onClick={() => setQuery('')}>
                  ×
                </button>
              )}
            </div>

            {clubCats.length > 1 && (
              <div className="chips" role="group" aria-label="Filter clubs by category">
                <button className="chip" style={{ '--c': '#1C2A2D' }}
                  aria-pressed={clubCat === 'All'} onClick={() => setClubCat('All')}>
                  All
                </button>
                {clubCats.map(([key, name]) => (
                  <button key={key} className="chip chip--dot" style={{ '--c': categoryColor(name) }}
                    aria-pressed={clubCat === key} onClick={() => setClubCat(key)}>
                    {name}
                  </button>
                ))}
              </div>
            )}

            {(q || clubCat !== 'All') && (
              <p className="finder__count" role="status">
                Showing {shownClubs.length} of {clubs.length} clubs
              </p>
            )}
          </div>
        )}

        {clubs.length > 0 && shownClubs.length === 0 && (
          <div className="noresults">
            <p>
              No clubs match
              {q ? ` "${query.trim()}"` : ''}
              {clubCat !== 'All' ? ` in ${clubCats.find(([k]) => k === clubCat)?.[1] || 'this category'}` : ''}.
              Try a different word or category.
            </p>
            <button className="btn btn--ghost" onClick={clearClubFilters}>Clear search and filters</button>
          </div>
        )}

        {shownClubs.map(c => (
          <ClubRow key={c.id} c={c} />
        ))}
      </section>

      <ContactSection />
    </div>
  )
}
