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
| **Report** | ⚠️ | Report an issue — a public form to flag a safety, access, disturbance or conservation concern to the committee. |
| **Admin** | 📊 | Password-gated panel with three sub-views: **Season Report** (visual totals — stat tiles plus bar charts by species, location and month), **Returns** (every bag return; tap for the full record), and **Issues** (everything reported via the Report tab). Returns and Issues each have a one-tap **CSV export** that opens straight in Excel. |

**Submit** and **Report** are open to all members. The **Admin** panel aggregates
every member's data, so it is behind a password gate (`M4rkJ0n3s`); the unlock
lasts for the browser session.

## Data

Two tables in Supabase.

### `bag_returns`

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

### `issue_reports`

| Column | Type | Notes |
| --- | --- | --- |
| `membership_number` | text | optional (reports may be anonymous) |
| `category` | text | Safety, Access / Gates, Disturbance, Wildlife / Conservation, App / Feedback, Other |
| `location` | text | optional — `Sands`, `Marshes` or `Elsewhere` |
| `description` | text | the issue |
| `submitted_at` | timestamptz | set automatically on insert |

## Security model

This is a club app with no member logins, so it uses Supabase's **publishable**
key in the browser (safe by design — it's not a secret). Access is controlled by
**Row Level Security**:

- **Insert** — allowed for everyone (members submit without an account).
- **Select** — allowed for everyone (the Admin panel is gated client-side).
- **Update / Delete** — no policy, so submitted rows are **immutable** via the
  app; they can only be changed from the Supabase dashboard.

Both `bag_returns` and `issue_reports` use this same model. The `M4rkJ0n3s`
password is a lightweight client-side gate on the Admin panel, not a server-side
protection. If you later want true protection (e.g. so only an admin can read all
data), add Supabase Auth and tighten the `select` policies.

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
  components/   TabBar, Stepper, Segmented, AdminGate,
                SeasonReport, ReturnsList, IssuesList
  screens/      SubmitScreen, ReportIssueScreen, AdminScreen
  lib/          supabase client, season helpers, admin gate,
                membership store, bag-returns & issue-reports hooks
  data/         species & issue-category definitions
  types.ts      shared types
  styles.css    all styling
```
