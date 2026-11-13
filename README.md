# Warangal Clubs & Events

A simple site listing clubs and events in Warangal. React (Vite) + Supabase + Vercel.

- `/` shows upcoming events and clubs (public)
- `/admin` is where you log in to add, edit, duplicate and delete events, and to add, edit and delete clubs (three tabs: Events, Clubs and Messages)

- Visitors who want to get listed use the contact form at the bottom of the home page. Their messages appear in the Messages tab at `/admin`. Your phone number is never shown on the site.

## Features
- **Share as a ticket:** "Share on WhatsApp" draws a ticket-style picture of the event (date, time, venue, host, poster and a QR code to your site). On phones it opens the share sheet with the picture attached, and you choose WhatsApp. On computers you can copy or download the picture, or open WhatsApp.
- **Search and filter:** visitors can search events and clubs, and filter both by category.
- **Add to calendar:** every event has a Google Calendar link and a downloadable .ics file (Apple, Outlook). Events have no end time, so the calendar entry lasts 2 hours.
- **Event posters:** attach a poster image to an event in `/admin`. It is shrunk automatically and shown on the site. Posters are stored in Supabase Storage (free tier: 1 GB, roughly thousands of posters).
- **Club link clicks:** `/admin` -> Clubs shows how many times each club's links were clicked in the last 30 days.
- **Visitor analytics:** Vercel Analytics (see "Turn on analytics" below).
- **SEO:** page title and description, link previews for WhatsApp and social media, `robots.txt`, `sitemap.xml`, and Google event data for upcoming events.

## Personalise
- `src/config.js`: site name.
- `src/theme.js`: category colours. A club whose category contains "book", "trek", "run", "art" and so on gets that colour automatically.
- Until you add Supabase keys, the home page shows sample content so you can preview the design.

## 1. Set up Supabase
1. Create a project at supabase.com.
2. SQL Editor -> New query -> paste everything from `supabase/schema.sql` -> Run.
   (Already ran an older schema? Also run these, one at a time, in this order: `supabase/messages.sql` (contact form), `supabase/club-links.sql` (extra club links like Reddit) and `supabase/upgrade-posters-and-clicks.sql` (event posters and club link click counts). Each is safe to run once; skip any you already ran.)
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

## 4. Keep Supabase awake (free plan pauses after about a week of no activity)
A GitHub job in `.github/workflows/keepalive.yml` reads one row from your database every day.
1. GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret. Add `SUPABASE_URL` (same as `VITE_SUPABASE_URL`) and `SUPABASE_ANON_KEY` (same as `VITE_SUPABASE_ANON_KEY`).
2. Repo -> Actions -> "Keep Supabase awake" -> Run workflow. A green tick means it works.
3. GitHub switches off scheduled jobs in public repos with no commits for 60 days. If that happens, open the Actions tab and click Enable, or push any small change.

## 5. Turn on analytics
Vercel project -> Analytics tab -> Enable. The site already includes the tracker. Visits to `/admin` are not counted. Data appears a few minutes after the first visits. Vercel's free plan includes a monthly allowance of page views.

## 6. Search engines and link previews
- On Vercel nothing is needed: your Vercel address is used automatically.
- When you buy a custom domain, add an environment variable `VITE_SITE_URL` in Vercel (for example `https://warangalclubs.in`) and redeploy. This sets the canonical address, the link preview image and the sitemap.
- Then add the site to Google Search Console and submit `/sitemap.xml`. This is what gets "Warangal clubs" searches to find you.
- Link preview image: replace `public/og-image.png` (1200 x 630) with your own if you like.
