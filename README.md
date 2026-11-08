# Warangal Clubs & Events

A simple site listing clubs and events in Warangal. React (Vite) + Supabase + Vercel.

- `/` shows upcoming events and clubs (public)
- `/admin` is where you log in to add, edit, duplicate and delete events, and to add, edit and delete clubs (three tabs: Events, Clubs and Messages)

- Visitors who want to get listed use the contact form at the bottom of the home page. Their messages appear in the Messages tab at `/admin`. Your phone number is never shown on the site.

## Personalise
- `src/config.js`: site name.
- `src/theme.js`: category colours. A club whose category contains "book", "trek", "run", "art" and so on gets that colour automatically.
- Until you add Supabase keys, the home page shows sample content so you can preview the design.

## 1. Set up Supabase
1. Create a project at supabase.com.
2. SQL Editor -> New query -> paste everything from `supabase/schema.sql` -> Run.
   (Already ran an older schema? Also run `supabase/messages.sql` (contact form) and `supabase/club-links.sql` (extra club links like Reddit), one at a time.)
3. Authentication -> Users -> Add user (your email + password, tick Auto confirm).
4. Authentication -> Sign In / Providers -> turn OFF "Allow new users to sign up".
5. Project Settings -> API -> copy the Project URL and the anon/public key.
6. Manage clubs and events from `/admin` on your site (no need to touch Table Editor).

## 2. Run locally
```bash
cp .env.example .env     # then paste your URL and anon key into .env
npm install
npm run dev
```
Open http://localhost:5173 and http://localhost:5173/admin.

## 3. Deploy
1. Push this folder to a GitHub repo (`.env` is git-ignored, which is correct).
2. vercel.com -> Add New -> Project -> import the repo.
3. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Every `git push` redeploys automatically.
