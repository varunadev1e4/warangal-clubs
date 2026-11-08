import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// True once your .env (or Vercel environment variables) are filled in.
export const hasSupabase = Boolean(url && key)

export const supabase = hasSupabase ? createClient(url, key) : null
