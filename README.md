# COD Duel Hub

A bilingual (Persian/English) social & duel-tracking platform for Call of Duty
Mobile players — challenge other players, chat, add friends, and log your
real match results by hand. Built with React, Vite, TypeScript, Tailwind CSS,
and Supabase.

> **Status:** this is a complete, real frontend architecture wired for
> Supabase — not a static mockup. Every page reads/writes through the
> Supabase client and the hooks in `src/hooks/`. You need to connect a
> Supabase project (see below) before data will actually flow.

## What's real vs. what you still need to do

- ✅ Full app architecture, routing, i18n, auth flows, RLS-ready queries
- ✅ Complete Supabase schema + Row Level Security policies (`/supabase`)
- ⬜ You need to create a Supabase project and run the SQL yourself
- ⬜ You need to add your own Supabase URL/anon key as env vars
- ⬜ Avatar image upload isn't wired to Supabase Storage yet — the profile
  editor currently accepts a plain avatar URL. Wiring Storage is a
  straightforward follow-up once your bucket policies are decided.

## 1. Install the project

```bash
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project's URL and anon (public) key:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Never put your Supabase **service_role** key here — anything prefixed
`VITE_` is bundled into the browser build. The anon key is safe to expose;
it's designed to be, since Row Level Security is what actually protects
your data.

## 3. Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run, **in this order**:
   1. `supabase/schema.sql` — tables, indexes, and the trigger functions
      that update stats/notifications server-side.
   2. `supabase/policies.sql` — Row Level Security policies. This must
      run second; it assumes the tables in `schema.sql` already exist.
3. In **Authentication → Providers**, make sure Email is enabled.
4. In **Authentication → URL Configuration**, add your local dev URL
   (`http://localhost:5173`) and your Netlify URL as allowed redirect
   URLs (needed for the password-reset flow).
5. Copy your project's URL and anon key from **Project Settings → API**
   into `.env.local`.

### Why stats update themselves

Wins/losses/draws/XP are never written directly by the client. Both
players submit their own `duel_confirmations` row with the score they
saw in their real COD Mobile match; a Postgres trigger
(`handle_duel_confirmation` in `schema.sql`) only marks the duel
`completed` and updates stats once both confirmations agree — otherwise
it flags the duel `disputed`. RLS additionally blocks any client
`UPDATE` that tries to touch `profiles.wins/losses/draws/total_duels/xp`
or `duels.challenger_score/opponent_score` directly.

## 4. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173`. The app defaults to Persian (RTL); use the
language switcher in the top bar to try English (LTR).

## 5. Deploy to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**.
3. Build command: `npm run build` — Publish directory: `dist`
   (already set in `netlify.toml`, along with the SPA redirect rule so
   deep links like `/players/abc123` work on refresh).
4. Under **Site settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Add the resulting `https://your-site.netlify.app` URL to
   Supabase's allowed redirect URLs (Authentication → URL Configuration).

## Project structure

```
src/
  i18n/            Persian + English dictionaries, RTL/LTR provider
  lib/             Supabase client, presence/last-seen helpers
  types/           TypeScript types mirroring the Supabase schema
  contexts/        Auth context (session, profile, sign in/up/out)
  hooks/           Data hooks — players, friends, duels, messages, etc.
  components/      UI building blocks, grouped by feature
  pages/           One file per route
supabase/
  schema.sql       Tables, indexes, triggers
  policies.sql     Row Level Security policies (apply after schema.sql)
```

## Notes on the design

- **"Online" only ever means active on this website.** The app never
  claims to know your real-time status inside Call of Duty Mobile
  itself — see `src/lib/presence.ts`.
- **Duel results are always self-reported.** There's no integration
  with Activision's servers; both players type in what happened after
  playing their real match, and the app requires both sides to agree
  before it counts.
- Database logic lives in hooks (`src/hooks/`), never inline in
  components, so swapping data sources later stays contained.
