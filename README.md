# Grange & District Wildfowlers – Bag Return

A mobile-first web app for logging wildfowling bag returns for the
**2025/26 season** (1 Sep 2025 – 31 Aug 2026).

Built with **React + Vite + TypeScript**, backed by **Supabase** (Postgres),
deployed on **Vercel**.

## Screens

A bottom tab bar with three tabs:

| Tab | Icon | What it does |
| --- | --- | --- |
| **Submit** | 📋 | Members log a visit: membership number (numeric keypad, remembered after first use and shown as "Submitting as …" on return visits), date (Today/Yesterday quick-picks plus a date field), location (must be chosen — no default), a stepper per species, live total, and notes. A visit with zero birds files as a **nil return** automatically — the submit button changes to "Submit nil return — shot nothing" so nothing is filed unknowingly. Enforces limits — a species blanks out at its cap, limits are re-checked against fresh totals at the moment of submission, and if the season visit or total-bird limit is reached the form closes. |
| **Report** | ⚠️ | Report an issue — a public form to flag a safety, access, disturbance or conservation concern to the committee. |
| **Admin** | 📊 | Password-gated panel (`M4rkJ0n3s`) with a **season selector** and sub-views: **Overview** (limit monitoring — alerts + progress bars + charts + CSV), **Returns** (view / **edit** / delete a record; CSV), **Leaderboard** (per-member season totals, sortable by any species or the total; CSV), **Issues** (unseen-report badge; CSV), **Members** (assign names to membership numbers), and **Settings** (season dates, the three limit types, a seasons table to make any season active / add the next one, and copy limits from the previous season). |

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

### Seasons & limits

- **`seasons`** — one row per season: `name` (e.g. `2025/26`), `start_date`,
  `end_date` (defaults 1 Sep → 20 Feb), `max_visits`, `max_total_birds`.
- **`species_limits`** — per-season, per-species club caps (`limit_value`;
  blank = no limit).
- **`app_settings`** — singleton pointer to the `current_season`.
- `bag_returns.season` tags every return with its season. A DB trigger derives it
  from the **visit date** on every insert and edit, so a return can't be filed
  against the wrong season regardless of which season is active. Resolution
  order: the season whose date window contains the date; else a season starting
  within the next 3 months (the pre-season lead-in files forward to the coming
  season); else the natural autumn→winter season (Jun–Dec → that autumn's
  season, Jan–May → the previous one). `resolveSeasonName` in
  `src/lib/season.ts` mirrors this logic for the Submit form — keep both in sync.

A `species_season_totals` view aggregates per-season totals (visits, total birds
and each species) and powers the limit checks shown on the Submit form and the
Admin overview.

The Admin panel keeps a season selector so any past season can be viewed, and a
**seasons table** in Settings lists every season, marks the active one, and lets
you make any season active with one tap (handy to undo an accidental change).
**Add season** appends the next season as a new row, copying the latest season's
dates & limits; you can also **copy all limits from the previous season** onto the
season you're editing. A warning banner appears on the Submit and Admin screens
when today's date is more than ~3 months outside the active season.

### Members

- **`members`** — optional `membership_number` → `name` directory. Where a name
  exists it's shown alongside the number across the admin (leaderboard, returns,
  issues) and as a hint on the Submit form; otherwise the number shows on its own.

## Security model

This is a club app with no member logins, so it uses Supabase's **publishable**
key in the browser (safe by design — it's not a secret). Access is controlled by
**Row Level Security**:

- **Insert / Select** — allowed for everyone (members submit without an account;
  the Admin panel is gated client-side).
- **Update / Delete** — enabled on `bag_returns` so the admin can edit/remove
  records and manage seasons/limits; `issue_reports` stays insert-only.

The `M4rkJ0n3s` password is a lightweight client-side gate on the Admin panel
(including the season and limit controls), not server-side protection — because
those actions run with the public key, treat the password as deterrence, not
security. For true protection, add Supabase Auth and tighten the policies.

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

## QR code

Generate a QR code that points members at the live site (run it offline — no
third-party QR service is used):

```bash
npm run qr -- https://your-site.vercel.app
```

This writes to `qr/`:

- `qr.svg` — vector QR, scales to any size
- `qr.png` — 1024px raster for slides / messaging
- `poster.svg` — a printable A4 "Scan to log your bag return" poster

Re-run it whenever the URL changes.

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
