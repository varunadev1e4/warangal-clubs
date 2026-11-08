-- ONLY needed if you already ran schema.sql before the contact form was added.
-- (If you are setting up fresh, schema.sql already includes this.)
-- Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  contact text not null check (char_length(contact) between 3 and 200),
  message text not null check (char_length(message) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

-- Visitors can SEND a message, but can never read any.
create policy "anyone can send a message" on messages
  for insert to anon, authenticated with check (is_read = false);

-- Only you (the logged-in admin) can read, mark as read, and delete.
create policy "admin read messages" on messages for select to authenticated using (true);
create policy "admin update messages" on messages
  for update to authenticated using (true) with check (true);
create policy "admin delete messages" on messages for delete to authenticated using (true);
