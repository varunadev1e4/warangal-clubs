-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  facebook_url text,
  instagram_url text,
  whatsapp_url text,
  other_links jsonb not null default '[]'::jsonb, -- extra links: [{"label": "Reddit", "url": "https://..."}]
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  club_id uuid references clubs(id) on delete set null,
  link text,
  created_at timestamptz default now()
);

alter table clubs enable row level security;
alter table events enable row level security;

-- everyone can read
create policy "public read clubs" on clubs for select using (true);
create policy "public read events" on events for select using (true);

-- only logged-in user (you, the admin) can write
create policy "admin write clubs" on clubs for all to authenticated using (true) with check (true);
create policy "admin write events" on events for all to authenticated using (true) with check (true);

-- Contact form messages (visitors can send, only you can read)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  contact text not null check (char_length(contact) between 3 and 200),
  message text not null check (char_length(message) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "anyone can send a message" on messages
  for insert to anon, authenticated with check (is_read = false);
create policy "admin read messages" on messages for select to authenticated using (true);
create policy "admin update messages" on messages
  for update to authenticated using (true) with check (true);
create policy "admin delete messages" on messages for delete to authenticated using (true);

/* ---------- Event posters, poster storage, club link clicks ---------- */
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

-- Optional sample data
insert into clubs (name, description, category, instagram_url) values
  ('Warangal Book Club', 'Monthly book discussions and swaps.', 'Books', 'https://instagram.com/'),
  ('Warangal Trek Club', 'Weekend treks around Warangal and Telangana.', 'Outdoors', 'https://instagram.com/'),
  ('Warangal Run Club', 'Sunday morning group runs for all levels.', 'Fitness', 'https://instagram.com/');
