// One place for all data access.
// With Supabase keys it talks to your database.
// Without keys it uses an in-memory demo store (resets on refresh).

import { supabase } from './supabase'
import { demoClubs, demoEvents, demoMessages } from './demo'

const mem = {
  clubs: demoClubs.map(c => ({ ...c })),
  events: demoEvents.map(e => ({ ...e })),
  messages: demoMessages.map(m => ({ ...m })),
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2)

const withClub = e => {
  const c = mem.clubs.find(c => c.id === e.club_id)
  return { ...e, clubs: c ? { name: c.name, category: c.category } : null }
}

export async function listClubs() {
  if (supabase) return supabase.from('clubs').select('*').order('name')
  return { data: [...mem.clubs].sort((a, b) => a.name.localeCompare(b.name)), error: null }
}

// `since` (ISO string) keeps only events starting at or after that moment.
export async function listEvents(since) {
  if (supabase) {
    let q = supabase.from('events').select('*, clubs(name, category)').order('starts_at')
    if (since) q = q.gte('starts_at', since)
    return q
  }
  let rows = mem.events.map(withClub)
  if (since) rows = rows.filter(e => e.starts_at >= since)
  rows.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  return { data: rows, error: null }
}

export async function saveClub(payload, id) {
  if (supabase) {
    return id
      ? supabase.from('clubs').update(payload).eq('id', id)
      : supabase.from('clubs').insert(payload)
  }
  if (id) mem.clubs = mem.clubs.map(c => (c.id === id ? { ...c, ...payload } : c))
  else mem.clubs.push({ id: uid(), ...payload })
  return { error: null }
}

export async function deleteClub(id) {
  if (supabase) return supabase.from('clubs').delete().eq('id', id)
  mem.clubs = mem.clubs.filter(c => c.id !== id)
  mem.events = mem.events.map(e => (e.club_id === id ? { ...e, club_id: null } : e))
  return { error: null }
}

export async function saveEvent(payload, id) {
  if (supabase) {
    return id
      ? supabase.from('events').update(payload).eq('id', id)
      : supabase.from('events').insert(payload)
  }
  if (id) mem.events = mem.events.map(e => (e.id === id ? { ...e, ...payload } : e))
  else mem.events.push({ id: uid(), ...payload })
  return { error: null }
}

export async function deleteEvent(id) {
  if (supabase) return supabase.from('events').delete().eq('id', id)
  mem.events = mem.events.filter(e => e.id !== id)
  return { error: null }
}

/* ---- contact form messages ---- */

// Anyone can send. Reading is admin-only (enforced by the database, not just the UI).
export async function sendMessage(payload) {
  if (supabase) return supabase.from('messages').insert(payload)
  mem.messages.push({ id: uid(), is_read: false, created_at: new Date().toISOString(), ...payload })
  return { error: null }
}

export async function listMessages() {
  if (supabase) return supabase.from('messages').select('*').order('created_at', { ascending: false })
  return {
    data: [...mem.messages].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    error: null,
  }
}

export async function setMessageRead(id, isRead) {
  if (supabase) return supabase.from('messages').update({ is_read: isRead }).eq('id', id)
  mem.messages = mem.messages.map(m => (m.id === id ? { ...m, is_read: isRead } : m))
  return { error: null }
}

export async function deleteMessage(id) {
  if (supabase) return supabase.from('messages').delete().eq('id', id)
  mem.messages = mem.messages.filter(m => m.id !== id)
  return { error: null }
}
