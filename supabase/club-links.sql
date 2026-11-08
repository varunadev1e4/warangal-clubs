-- ONLY needed if you already ran schema.sql before "more links" was added.
-- (If you are setting up fresh, schema.sql already includes this.)
-- Supabase: SQL Editor -> New query -> paste -> Run

alter table clubs
  add column if not exists other_links jsonb not null default '[]'::jsonb;
