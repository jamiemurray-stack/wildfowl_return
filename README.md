# Grange & District Wildfowlers – Bag Return

A mobile-first web app for logging wildfowling bag returns for the
**2025/26 season** (1 Sep 2025 – 31 Aug 2026).

Built with **React + Vite + TypeScript**, backed by **Supabase** (Postgres),
deployed on **Vercel**.

## Screens

A bottom tab bar with three tabs:

| Tab | Icon | What it does |
| --- | --- | --- |
| **Submit** | 📋 | The main form. Members log a visit: membership number, date, location (Sands / Marshes), a stepper for each of the seven quarry species, a "Nil return" toggle, a live "Total shot" total, and optional notes. |
| **Report** | ⚠️ | Season summary: total returns, total birds, nil returns, plus breakdowns by species and by location. |
| **History** | 📊 | A list of every past return (date, location, total). Tap any row to see the full record. |

**Report** and **History** aggregate every member's data, so both are behind a
password gate (`M4rkJ0n3s`). The unlock lasts for the browser session. **Submit**
is open to all members.

## Data

One table, `bag_returns`, in Supabase:

| Column | Type | Notes |
| --- | --- | --- |
| `membership_number` | text | |
| `date_of_visit` | date | |
| `location` | text | `Sands` or `Marshes` (DB check constraint) |
| `pink_footed_goose` … `snipe` | int | Seven species, default 0, never negative |
| `nil_return` | boolean | "shot nothing" |
| `total_shot` | int | **Generated column** = sum of the seven species |
| `notes` | text | optional |
| `submitted_at` | timestamptz | set automatically on insert |

`total_shot` is a Postgres `GENERATED ALWAYS … STORED` column, so the total is
always computed by the database and can't drift from the species counts.

## Security model

This is a club app with no member logins, so it uses Supabase's **publishable**
key in the browser (safe by design — it's not a secret). Access is controlled by
**Row Level Security**:

- **Insert** — allowed for everyone (members submit without an account).
- **Select** — allowed for everyone (the admin views are gated client-side).
- **Update / Delete** — no policy, so submitted returns are **immutable** via the
  app; they can only be changed from the Supabase dashboard.

The `M4rkJ0n3s` password is a lightweight client-side gate on the admin tabs, not
a server-side protection. If you later want true protection (e.g. so only an
admin can read all returns), add Supabase Auth and tighten the `select` policy.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
```

The Supabase URL and publishable key are baked in (see `src/lib/supabase.ts`), so
it runs with no setup. To point at a different project, copy `.env.example` to
`.env` and edit the values.

```bash
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run typecheck
```

## Deployment

Deployed to Vercel as a static Vite build (build command `vite build`, output
`dist`). No server-side environment variables are required because the public
Supabase credentials are bundled; set `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` in Vercel only if you fork to a different backend.

## Project layout

```
src/
  components/   TabBar, Stepper, Segmented, AdminGate
  screens/      SubmitScreen, ReportScreen, HistoryScreen
  lib/          supabase client, season helpers, admin gate, data hook
  data/         species definitions
  types.ts      shared types
  styles.css    all styling
```
