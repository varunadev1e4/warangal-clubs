-- Run ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- (Safe to run again. Fresh installs already get this from schema.sql.)
--
-- Adds:
--   1. events.poster_url         -> event posters
--   2. "posters" storage bucket  -> where poster images are kept (public to view, only you can upload)
--   3. link_clicks + view        -> counts of clicks on club links, visible only to you

/* ---------- 1. Poster column ---------- */
alter table events add column if not exists poster_url text;

/* ---------- 2. Poster storage ---------- */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posters', 'posters', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin read posters" on storage.objects;
drop policy if exists "admin upload posters" on storage.objects;
drop policy if exists "admin update posters" on storage.objects;
drop policy if exists "admin delete posters" on storage.objects;

-- Anyone can VIEW a poster through its public link. Only the logged-in admin can change them.
create policy "admin read posters" on storage.objects
  for select to authenticated using (bucket_id = 'posters');
create policy "admin upload posters" on storage.objects
  for insert to authenticated with check (bucket_id = 'posters');
create policy "admin update posters" on storage.objects
  for update to authenticated using (bucket_id = 'posters');
create policy "admin delete posters" on storage.objects
  for delete to authenticated using (bucket_id = 'posters');

/* ---------- 3. Club link click counts ---------- */
create table if not exists link_clicks (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  created_at timestamptz not null default now()
);

alter table link_clicks enable row level security;

drop policy if exists "anyone can log a click" on link_clicks;
drop policy if exists "admin read clicks" on link_clicks;
drop policy if exists "admin delete clicks" on link_clicks;

-- Visitors can only ADD a click. Only you can read or delete them.
create policy "anyone can log a click" on link_clicks
  for insert to anon, authenticated with check (true);
create policy "admin read clicks" on link_clicks
  for select to authenticated using (true);
create policy "admin delete clicks" on link_clicks
  for delete to authenticated using (true);

create index if not exists link_clicks_club_idx on link_clicks (club_id, created_at);

-- Per-club totals used by the admin page. security_invoker keeps the rules above in force.
create or replace view club_click_stats with (security_invoker = true) as
select
  club_id,
  count(*) filter (where created_at > now() - interval '30 days') as clicks_30d,
  count(*) as clicks_total
from link_clicks
group by club_id;
