import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import * as db from './db'
import Header from './Header'
import { longDate, timeStr } from './format'
import { categoryColor, initials } from './theme'

const emptyEvent = { title: '', description: '', location: '', starts_at: '', club_id: '', link: '' }
const emptyClub = {
  name: '', category: '', description: '', instagram_url: '', facebook_url: '', whatsapp_url: '',
  links: [],
}

// Extra links a club can have besides Instagram, Facebook and WhatsApp.
const LINK_PRESETS = [
  'Reddit', 'Telegram', 'Discord', 'YouTube', 'X (Twitter)', 'LinkedIn', 'Strava', 'Meetup', 'Website',
]
const emptyLink = { platform: 'Reddit', label: '', url: '' }

// saved [{label, url}] <-> form rows [{platform, label, url}]
const toRows = arr =>
  (Array.isArray(arr) ? arr : []).map(l =>
    LINK_PRESETS.includes(l.label)
      ? { platform: l.label, label: '', url: l.url || '' }
      : { platform: 'Other', label: l.label || '', url: l.url || '' }
  )
const fromRows = rows =>
  rows
    .filter(r => r.url.trim())
    .map(r => ({
      label: r.platform === 'Other' ? r.label.trim() || 'Link' : r.platform,
      url: r.url.trim(),
    }))
const CATEGORY_HINTS = ['Books', 'Outdoors', 'Fitness', 'Arts', 'Music', 'Photography']

// ISO date -> the value format <input type="datetime-local"> expects (device time)
const toLocal = d => {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 16)
}
const clean = v => (v || '').trim() || null

// Turn whatever the visitor typed into tap-to-reply links (admin only).
function contactLinks(contact) {
  const v = (contact || '').trim()
  if (/^\S+@\S+\.\S+$/.test(v)) return [['Email', `mailto:${v}`]]
  const digits = v.replace(/\D/g, '')
  if (digits.length >= 10 && /^[+\d\s()-]+$/.test(v)) {
    const full = digits.length === 10 ? '91' + digits : digits // 10 digits = Indian number
    return [['Call', `tel:+${full}`], ['WhatsApp', `https://wa.me/${full}`]]
  }
  if (/^@[\w.]+$/.test(v)) return [['Instagram', `https://instagram.com/${v.slice(1)}`]]
  return []
}

/* ---------------- Login ---------------- */
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="wrap wrap--narrow">
      <Header admin />
      <form className="panel" onSubmit={submit}>
        <h1 className="panel__title display">Admin log in</h1>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="username" value={email}
            onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div>
          <button className="btn" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </div>
      </form>
    </div>
  )
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ session, demo }) {
  const [tab, setTab] = useState('events')
  const [events, setEvents] = useState([])
  const [clubs, setClubs] = useState([])
  const [eventForm, setEventForm] = useState(emptyEvent)
  const [editEventId, setEditEventId] = useState(null)
  const [clubForm, setClubForm] = useState(emptyClub)
  const [editClubId, setEditClubId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesError, setMessagesError] = useState('')
  const [toast, setToast] = useState(null)

  const say = (text, kind = 'ok') => setToast({ text, kind })

  useEffect(() => {
    if (!toast || toast.kind === 'error') return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const load = async () => {
    const [c, e] = await Promise.all([db.listClubs(), db.listEvents()])
    if (c.error || e.error) say((c.error || e.error).message, 'error')
    setClubs(c.data || [])
    setEvents(e.data || [])
    // Loaded on its own so clubs and events still work if the messages table isn't set up yet.
    const m = await db.listMessages()
    if (m.error) setMessagesError(m.error.message)
    else { setMessagesError(''); setMessages(m.data || []) }
  }
  useEffect(() => { load() }, [])

  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  /* ----- events ----- */
  const setE = k => e => setEventForm({ ...eventForm, [k]: e.target.value })

  const saveEvent = async e => {
    e.preventDefault()
    const payload = {
      title: eventForm.title.trim(),
      description: clean(eventForm.description),
      location: clean(eventForm.location),
      link: clean(eventForm.link),
      starts_at: new Date(eventForm.starts_at).toISOString(),
      club_id: eventForm.club_id || null,
    }
    const { error } = await db.saveEvent(payload, editEventId)
    if (error) return say(error.message, 'error')
    say(editEventId ? 'Saved.' : 'Published.')
    setEventForm(emptyEvent)
    setEditEventId(null)
    load()
  }

  const eventFields = ev => ({
    title: ev.title || '',
    description: ev.description || '',
    location: ev.location || '',
    link: ev.link || '',
    club_id: ev.club_id || '',
  })

  const editEvent = ev => {
    setEditEventId(ev.id)
    setEventForm({ ...eventFields(ev), starts_at: toLocal(ev.starts_at) })
    top()
  }

  // Handy for weekly events: copy the details, then just pick the new date.
  const duplicateEvent = ev => {
    setEditEventId(null)
    setEventForm({ ...eventFields(ev), starts_at: '' })
    top()
    say('Copied into the form. Pick a new date, then publish.')
  }

  const deleteEvent = async ev => {
    if (!window.confirm(`Delete "${ev.title}"? This can't be undone.`)) return
    const { error } = await db.deleteEvent(ev.id)
    if (error) return say(error.message, 'error')
    if (editEventId === ev.id) { setEditEventId(null); setEventForm(emptyEvent) }
    say('Deleted.')
    load()
  }

  /* ----- clubs ----- */
  const setC = k => e => setClubForm({ ...clubForm, [k]: e.target.value })
  const addLink = () => setClubForm({ ...clubForm, links: [...clubForm.links, { ...emptyLink }] })
  const setLink = (i, k, v) =>
    setClubForm({ ...clubForm, links: clubForm.links.map((l, j) => (j === i ? { ...l, [k]: v } : l)) })
  const removeLink = i =>
    setClubForm({ ...clubForm, links: clubForm.links.filter((_, j) => j !== i) })

  const saveClub = async e => {
    e.preventDefault()
    const payload = {
      name: clubForm.name.trim(),
      category: clean(clubForm.category),
      description: clean(clubForm.description),
      instagram_url: clean(clubForm.instagram_url),
      facebook_url: clean(clubForm.facebook_url),
      whatsapp_url: clean(clubForm.whatsapp_url),
    }
    // Only send extra links when there are some (or the column already exists),
    // so saving still works on a database that hasn't had club-links.sql run yet.
    const links = fromRows(clubForm.links)
    const editing = clubs.find(c => c.id === editClubId)
    if (links.length || (editing && 'other_links' in editing)) payload.other_links = links

    const { error } = await db.saveClub(payload, editClubId)
    if (error) {
      return say(
        /other_links/.test(error.message)
          ? 'To save extra links, run supabase/club-links.sql once in the Supabase SQL Editor, then try again.'
          : error.message,
        'error'
      )
    }
    say(editClubId ? 'Saved.' : 'Published.')
    setClubForm(emptyClub)
    setEditClubId(null)
    load()
  }

  const editClub = c => {
    setEditClubId(c.id)
    setClubForm({
      name: c.name || '',
      category: c.category || '',
      description: c.description || '',
      instagram_url: c.instagram_url || '',
      facebook_url: c.facebook_url || '',
      whatsapp_url: c.whatsapp_url || '',
      links: toRows(c.other_links),
    })
    top()
  }

  const deleteClub = async c => {
    const n = events.filter(e => e.club_id === c.id).length
    const extra = n ? ` Its ${n} event${n > 1 ? 's' : ''} will stay on the site as city events.` : ''
    if (!window.confirm(`Delete "${c.name}"?${extra} This can't be undone.`)) return
    const { error } = await db.deleteClub(c.id)
    if (error) return say(error.message, 'error')
    if (editClubId === c.id) { setEditClubId(null); setClubForm(emptyClub) }
    say('Deleted.')
    load()
  }

  /* ----- messages ----- */
  const toggleRead = async m => {
    const { error } = await db.setMessageRead(m.id, !m.is_read)
    if (error) return say(error.message, 'error')
    load()
  }

  const deleteMessage = async m => {
    if (!window.confirm(`Delete the message from ${m.name}? This can't be undone.`)) return
    const { error } = await db.deleteMessage(m.id)
    if (error) return say(error.message, 'error')
    say('Deleted.')
    load()
  }

  const unread = messages.filter(m => !m.is_read).length

  /* ----- render helpers ----- */
  const now = Date.now()
  const upcoming = events.filter(e => new Date(e.starts_at) >= now)
  const past = events.filter(e => new Date(e.starts_at) < now).reverse()

  const eventRow = (ev, isPast) => (
    <div key={ev.id} className={'admin-row' + (isPast ? ' is-past' : '')}>
      <div className="admin-row__main">
        <b className="admin-row__title">{ev.title}</b>
        <span className="muted">{longDate(ev.starts_at)}, {timeStr(ev.starts_at)}</span>
        <span className="muted">{ev.clubs ? ev.clubs.name : 'City event'}</span>
      </div>
      <div className="admin-row__actions">
        <button className="btn btn--small btn--ghost" onClick={() => editEvent(ev)}>Edit</button>
        <button className="btn btn--small btn--ghost" onClick={() => duplicateEvent(ev)}>Duplicate</button>
        <button className="btn btn--small btn--danger" onClick={() => deleteEvent(ev)}>Delete</button>
      </div>
    </div>
  )

  const messageRow = m => (
    <article key={m.id} className={'msg' + (m.is_read ? '' : ' is-unread')}>
      <div className="msg__head">
        <span className="msg__name">{m.name}</span>
        <span className="muted">{longDate(m.created_at)}, {timeStr(m.created_at)}</span>
        {!m.is_read && <span className="muted">New</span>}
      </div>
      <p className="msg__contact">
        <span>{m.contact}</span>
        {contactLinks(m.contact).map(([label, url]) => (
          <a key={label} className="textlink" href={url} target="_blank" rel="noreferrer">{label}</a>
        ))}
      </p>
      <p className="msg__body">{m.message}</p>
      <div className="msg__actions">
        <button className="btn btn--small btn--ghost" onClick={() => toggleRead(m)}>
          {m.is_read ? 'Mark as unread' : 'Mark as read'}
        </button>
        <button className="btn btn--small btn--danger" onClick={() => deleteMessage(m)}>Delete</button>
      </div>
    </article>
  )

  const clubRow = c => {
    const n = events.filter(e => e.club_id === c.id).length
    return (
      <div key={c.id} className="admin-row">
        <div className="admin-row__id">
          <div className="club__tile club__tile--sm" style={{ '--c': categoryColor(c.category) }} aria-hidden="true">
            {initials(c.name)}
          </div>
          <div className="admin-row__main">
            <b className="admin-row__title">{c.name}</b>
            <span className="muted">{c.category || 'No category'}</span>
            <span className="muted">{n} event{n === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="admin-row__actions">
          <button className="btn btn--small btn--ghost" onClick={() => editClub(c)}>Edit</button>
          <button className="btn btn--small btn--danger" onClick={() => deleteClub(c)}>Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <Header admin />

      {demo && (
        <p className="notice">
          Demo mode: Supabase isn't connected, so changes disappear when you refresh. Add your keys
          to <code>.env</code> to save for real.
        </p>
      )}

      <div className="admin-bar">
        <h1 className="admin-bar__title display">Manage</h1>
        {!demo && <span className="muted">{session.user.email}</span>}
        {!demo && (
          <button className="btn btn--small btn--ghost" onClick={() => supabase.auth.signOut()}>
            Log out
          </button>
        )}
      </div>

      <div className="tabs" role="tablist" aria-label="What to manage">
        <button role="tab" id="tab-events" aria-selected={tab === 'events'} className="tab"
          onClick={() => setTab('events')}>
          Events ({events.length})
        </button>
        <button role="tab" id="tab-clubs" aria-selected={tab === 'clubs'} className="tab"
          onClick={() => setTab('clubs')}>
          Clubs ({clubs.length})
        </button>
        <button role="tab" id="tab-messages" aria-selected={tab === 'messages'} className="tab"
          onClick={() => setTab('messages')}>
          Messages
          {unread > 0 && <span className="badge" aria-label={`${unread} unread`}>{unread}</span>}
        </button>
      </div>

      {tab === 'events' && (
        <div role="tabpanel" aria-labelledby="tab-events">
          <form className="panel" onSubmit={saveEvent}>
            <h2 className="panel__title display">{editEventId ? 'Edit event' : 'Add an event'}</h2>
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="title">Title</label>
                <input id="title" required value={eventForm.title} onChange={setE('title')} />
              </div>
              <div className="field">
                <label htmlFor="starts">Date and time</label>
                <input id="starts" type="datetime-local" required value={eventForm.starts_at}
                  onChange={setE('starts_at')} />
              </div>
              <div className="field">
                <label htmlFor="club">Hosted by</label>
                <select id="club" value={eventForm.club_id} onChange={setE('club_id')}>
                  <option value="">City event (no club)</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="loc">Location</label>
                <input id="loc" value={eventForm.location} onChange={setE('location')} />
              </div>
              <div className="field">
                <label htmlFor="link">Link (registration or details)</label>
                <input id="link" type="url" placeholder="https://" value={eventForm.link}
                  onChange={setE('link')} />
              </div>
              <div className="field span-2">
                <label htmlFor="desc">Description</label>
                <textarea id="desc" rows={4} value={eventForm.description} onChange={setE('description')} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn">{editEventId ? 'Save changes' : 'Publish event'}</button>
              {editEventId && (
                <button type="button" className="btn btn--ghost"
                  onClick={() => { setEditEventId(null); setEventForm(emptyEvent) }}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <h2 className="section-title display">Upcoming</h2>
          {upcoming.length === 0 && <p className="muted">No upcoming events. Add one above.</p>}
          {upcoming.map(ev => eventRow(ev, false))}

          {past.length > 0 && (
            <>
              <h2 className="section-title display">Past</h2>
              {past.map(ev => eventRow(ev, true))}
            </>
          )}
        </div>
      )}

      {tab === 'clubs' && (
        <div role="tabpanel" aria-labelledby="tab-clubs">
          <form className="panel" onSubmit={saveClub}>
            <h2 className="panel__title display">{editClubId ? 'Edit club' : 'Add a club'}</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="cname">Club name</label>
                <input id="cname" required value={clubForm.name} onChange={setC('name')} />
              </div>
              <div className="field">
                <label htmlFor="ccat">Category</label>
                <input id="ccat" list="cat-hints" value={clubForm.category} onChange={setC('category')}
                  placeholder="Books, Outdoors, Fitness…" />
                <datalist id="cat-hints">
                  {CATEGORY_HINTS.map(h => <option key={h} value={h} />)}
                </datalist>
              </div>
              <div className="field span-2">
                <label htmlFor="cdesc">Description</label>
                <textarea id="cdesc" rows={3} value={clubForm.description} onChange={setC('description')} />
              </div>
              <div className="field">
                <label htmlFor="cig">Instagram link</label>
                <input id="cig" type="url" placeholder="https://" value={clubForm.instagram_url}
                  onChange={setC('instagram_url')} />
              </div>
              <div className="field">
                <label htmlFor="cfb">Facebook link</label>
                <input id="cfb" type="url" placeholder="https://" value={clubForm.facebook_url}
                  onChange={setC('facebook_url')} />
              </div>
              <div className="field span-2">
                <label htmlFor="cwa">WhatsApp group or chat link</label>
                <input id="cwa" type="url" placeholder="https://chat.whatsapp.com/…" value={clubForm.whatsapp_url}
                  onChange={setC('whatsapp_url')} />
              </div>
              <fieldset className="field span-2 linkset">
                <legend>More links (Reddit, Telegram, YouTube and others)</legend>
                {clubForm.links.map((l, i) => {
                  const name = l.platform === 'Other' ? l.label || 'Link' : l.platform
                  return (
                    <div className="linkrow" key={i}>
                      <select aria-label="Platform" value={l.platform}
                        onChange={e => setLink(i, 'platform', e.target.value)}>
                        {LINK_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="Other">Other…</option>
                      </select>
                      {l.platform === 'Other' && (
                        <input aria-label="Platform name" placeholder="Name, e.g. Substack" value={l.label}
                          onChange={e => setLink(i, 'label', e.target.value)} />
                      )}
                      <input aria-label={`${name} link`} type="url" placeholder="https://" value={l.url}
                        onChange={e => setLink(i, 'url', e.target.value)} />
                      <button type="button" className="btn btn--small btn--ghost"
                        onClick={() => removeLink(i)}>
                        Remove
                      </button>
                    </div>
                  )
                })}
                <div>
                  <button type="button" className="btn btn--small btn--ghost" onClick={addLink}>
                    Add a link
                  </button>
                </div>
              </fieldset>
            </div>
            <div className="preview">
              <div className="club__tile club__tile--sm" style={{ '--c': categoryColor(clubForm.category) }} aria-hidden="true">
                {initials(clubForm.name || 'Club')}
              </div>
              <span className="muted">How this club's tile and event stripes will look.</span>
            </div>
            <div className="form-actions">
              <button className="btn">{editClubId ? 'Save changes' : 'Publish club'}</button>
              {editClubId && (
                <button type="button" className="btn btn--ghost"
                  onClick={() => { setEditClubId(null); setClubForm(emptyClub) }}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <h2 className="section-title display">All clubs</h2>
          {clubs.length === 0 && <p className="muted">No clubs yet. Add one above.</p>}
          {clubs.map(clubRow)}
        </div>
      )}

      {tab === 'messages' && (
        <div role="tabpanel" aria-labelledby="tab-messages">
          <h2 className="section-title display">Messages</h2>
          <p className="muted">People who filled in the contact form on your site. Only you can see these.</p>
          {messagesError && (
            <p className="error" role="alert">
              Couldn't load messages: {messagesError}. If this is a new feature for your project, run{' '}
              <code>supabase/messages.sql</code> in the Supabase SQL Editor.
            </p>
          )}
          {!messagesError && messages.length === 0 && (
            <p className="muted">No messages yet. They'll show up here as soon as someone writes in.</p>
          )}
          {messages.map(messageRow)}
        </div>
      )}

      {toast && (
        <div className={'toast' + (toast.kind === 'error' ? ' toast--error' : '')} role="status">
          {toast.text}
          {toast.kind === 'error' && (
            <button className="toast__close" onClick={() => setToast(null)} aria-label="Dismiss">×</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- Entry ---------------- */
export default function Admin() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!supabase) return <Dashboard demo />
  if (checking) return <div className="wrap"><p className="muted">Loading…</p></div>
  return session ? <Dashboard session={session} /> : <Login />
}
