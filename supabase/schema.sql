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

-- Optional sample data
insert into clubs (name, description, category, instagram_url) values
  ('Warangal Book Club', 'Monthly book discussions and swaps.', 'Books', 'https://instagram.com/'),
  ('Warangal Trek Club', 'Weekend treks around Warangal and Telangana.', 'Outdoors', 'https://instagram.com/'),
  ('Warangal Run Club', 'Sunday morning group runs for all levels.', 'Fitness', 'https://instagram.com/');
