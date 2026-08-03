# UI & QA Audit — Grange & District Wildfowlers Bag Return

> **Update (same day):** the recommended harden / polish / clarify / optimize /
> adapt passes have been applied on this branch. All five P1s, all P2s except
> the accepted-risk security posture and the server-side cap trigger (both need
> DB-side changes), and the P3 items 1–5, 8, 9 and 11-adjacent (network-failure
> guards) are fixed. Still open: Supabase RPC/auth hardening, a DB-side cap
> check, emoji→SVG icons, and a service-worker offline queue. During the work a
> further P1-class bug was found and fixed: a hard network failure *rejects*
> supabase-js fetches, which bypassed every `{ error }` check and could leave
> forms stuck on "Saving…" — all queries and mutations are now guarded.

*Audited 3 Aug 2026 on `claude/ui-qa-audit-cty145` (HEAD `3fac794`). Method: Impeccable technical audit (accessibility, performance, theming, responsive, implementation integrity) plus a general QA pass over correctness, data handling and robustness. Every finding was verified against the source; contrast ratios were computed, not estimated. `npm run typecheck` and `npm run build` both pass clean.*

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3/4 | Muted text is 3.95:1 on the page background (AA needs 4.5:1); nil-return switch has no visible keyboard focus |
| 2 | Performance | 3/4 | 403 kB JS (113 kB gzip), admin code shipped to every member; three minor layout-property transitions |
| 3 | Responsive design | 3/4 | Solid mobile-first foundation; stepper buttons 40×40 and small row-action links for a gloved-hands field app |
| 4 | Theming | 3/4 | Good CSS-token system, consistently used; ~15 one-off literals and no dark mode |
| 5 | Implementation integrity | 3/4 | Coherent, product-specific throughout; the future-date cap TODO is the main promise-vs-code gap |
| **Total** | | **15/20** | **Good — address the weak spots below** |

## Implementation integrity verdict

**Pass.** The implementation expresses a coherent, product-specific system: one token palette, one card/field/stepper language reused everywhere, real club content (seven quarry species, Sands/Marshes, season windows), and the DB-vs-client season-filing duplication is explicitly documented in both places (`README.md`, `src/lib/season.ts:57-60`). The bundled detector found only 3 issues (layout-property transitions, verified minor — see P3). No fake data, no placeholder copy, no dead links.

## Executive summary

- **15/20 (Good).** No P0s — nothing blocks a member from submitting a return today.
- Counts: **P0 0 · P1 5 · P2 10 · P3 11**.
- Top issues: (1) the future-date cap is still missing (known TODO), (2) limit enforcement silently disappears on a failed/offline totals fetch and is client-side only, (3) muted-text contrast fails AA on the page background, (4) the nil-return switch has no keyboard focus indicator, (5) CSV exports are open to Excel formula injection from member-supplied text.
- The security posture (client-side password, world-readable/writable tables) is *documented* accepted risk in the README — restated below with one cheap hardening suggestion, not inflated.

---

## Detailed findings

### P1 — fix before go-live

**[P1] Future-date cap still missing on the Submit form**
- **Location:** `src/screens/SubmitScreen.tsx:53-61`
- **Category:** Correctness
- **Impact:** The date input has `min` but no `max`; a fat-fingered year (e.g. 2027) files a return into a far-future season with no warning. The code's own TODO says to restore the cap before go-live.
- **Fix:** Set `max` to the furthest configured season's `end_date` (available from `useSettings().seasons`), and reject out-of-range dates in `formValid`.

**[P1] Limit enforcement silently disappears when the totals fetch fails**
- **Location:** `src/lib/useSeasonTotals.ts:21-39`; same pattern in `src/lib/useSettings.tsx:69-135`
- **Category:** Correctness / Robustness
- **Impact:** Both hooks ignore query errors. On a marsh with poor signal, the totals read fails → totals fall back to zero → every species shows its full allowance and the "season closed" gate never trips, with no error shown. Settings failures likewise fall back silently to default season config with no caps.
- **Fix:** Track the error, and while totals are unknown either disable submission or show a "limits unavailable — will be checked on save" notice. (Pairs with the P2 server-side check below.)

**[P1] Muted text fails AA contrast on the page background**
- **Location:** `src/styles.css:5` (`--muted: #6c7a72`) used on `--bg: #eef1ec` by `.app-caption`, `.stat-label`, `.muted-count`, `.state`, `.month-label`, `.season-picker-label`, `.issue-tag`
- **Category:** Accessibility — WCAG 1.4.3 (AA)
- **Impact:** 3.95:1 measured (4.5:1 required). These are small-size labels: season caption, stat labels, empty states — hard to read in bright field light. On white cards `--muted` is exactly 4.50:1, so only the on-`--bg` uses fail.
- **Fix:** Darken to `#5b6962` (≈4.9:1 on `--bg`) or introduce a `--muted-strong` for text sitting directly on the page background.

**[P1] Nil-return switch has no visible keyboard focus**
- **Location:** `src/styles.css:53-57` (focus rules cover only `button` and `.input`); switch markup `src/screens/SubmitScreen.tsx:258-272`, `src/components/EditReturn.tsx:146-159`
- **Category:** Accessibility — WCAG 2.4.7 (AA)
- **Impact:** The checkbox inside `.switch` is `opacity: 0`; tabbing to it gives no visual indication at all, so keyboard users can't tell the toggle is focused.
- **Fix:** `.switch input:focus-visible + .switch-track { outline: 2px solid var(--brand); outline-offset: 2px; }`.

**[P1] Leaderboard sorting is mouse-only**
- **Location:** `src/components/Leaderboard.tsx:162-186` (`onClick` on `<th>`)
- **Category:** Accessibility — WCAG 2.1.1 / 4.1.2
- **Impact:** Sortable headers aren't focusable, aren't announced as sortable (`aria-sort` missing), and can't be operated by keyboard. Admin-only, but the admin may well be a keyboard user.
- **Fix:** Wrap header text in a `<button>` inside the `<th>`, add `aria-sort` on the active column and `scope="col"` on all headers.

### P2 — fix in the next pass

**[P2] CSV exports allow Excel formula injection**
- **Location:** `src/lib/csv.ts:8-11`; exported member-supplied text: notes (`ReturnsList.tsx:34`), issue descriptions (`IssuesList.tsx:33`), member names (`Leaderboard.tsx:105`)
- **Impact:** A note or issue description starting with `=`, `+`, `-` or `@` executes as a formula when the admin opens the CSV in Excel (the code deliberately targets Excel with BOM + CRLF). A malicious or accidental `=HYPERLINK(...)` in a note lands in the committee's spreadsheet.
- **Fix:** In `escapeCell`, prefix cells matching `/^[=+\-@\t\r]/` with `'` (or a space), or wrap them as `"=..."` text.

**[P2] Caps can be breached by concurrent or stale submissions**
- **Location:** `src/screens/SubmitScreen.tsx:106-140` (no re-check before insert); README notes no DB-side cap enforcement
- **Impact:** Totals are read at mount. Two members submitting near a cap both pass validation; a member with a long-open tab validates against stale totals. The DB accepts both.
- **Fix:** Cheapest client fix: `await reloadTotals()` and re-validate inside `handleSubmit` before insert. Proper fix: a Postgres check in a trigger (mirror of the season-filing trigger) that rejects inserts breaching season/species caps.

**[P2] No error boundary**
- **Location:** `src/main.tsx:6-10`
- **Impact:** Any uncaught render error gives a permanently blank white page — the worst outcome for a member standing on a marsh. React 18 unmounts the tree on uncaught errors.
- **Fix:** Wrap `<App />` in a small error boundary with a "Something went wrong — reload" card.

**[P2] Edit form skips all validation**
- **Location:** `src/components/EditReturn.tsx:52-72`
- **Impact:** The admin can blank the membership number (saves `""`), clear the date (DB error surfaces raw), or save a 0-bird non-nil return. None of the Submit form's checks are applied on edit.
- **Fix:** Reuse the Submit form's `membershipValid` / `dateValid` / `bagValid` checks before `save()`.

**[P2] Season settings accept an end date before the start date**
- **Location:** `src/components/SettingsView.tsx:71-86`
- **Impact:** An inverted or empty date range saves silently and then quietly breaks season resolution (`resolveSeasonName` never matches) and the months chart.
- **Fix:** Block save when `endDate <= startDate` or either is empty, with an inline error.

**[P2] A typo in a limit field silently removes the limit**
- **Location:** `src/components/SettingsView.tsx:64-69` (`parseLimit` maps any non-numeric string to `null` = "no limit")
- **Impact:** "1O0" (letter O) saves as *no limit* with a green "Saved ✓" — the opposite of intent, invisible until the season is over-shot.
- **Fix:** Reject non-numeric non-empty input with an inline error instead of coercing to `null`.

**[P2] Switching tabs destroys a half-filled form without warning**
- **Location:** `src/App.tsx:14-19` (deliberate remount per tab)
- **Impact:** A member filling the bag return who taps Report (or Admin) and comes back finds everything but their remembered membership number gone.
- **Fix:** Keep screens mounted and hide with CSS (`display: none`), or hold Submit-form state in a parent/context so remount is safe. (The remount-for-gate rationale only needs the *admin* screen remounted.)

**[P2] Clearing the date renders "Bag Return N/N Season" / "Invalid Date"**
- **Location:** `src/lib/season.ts:50-55` (`seasonNameForDate('')` → `"NaN/NaN"`), rendered via header at `src/screens/SubmitScreen.tsx:146-149`
- **Impact:** Desktop and iOS date inputs can be cleared; the header then shows `Bag Return N/N Season` and `Season Invalid Date to Invalid Date`. Submission stays blocked (`dateValid`), so this is cosmetic — but it looks broken. Verified by executing the helper.
- **Fix:** Fall back to the active season when the date field is empty.

**[P2 — accepted risk, restated] Anyone with the URL can read every table and write the admin tables**
- **Location:** `src/lib/supabase.ts` (public key by design); `src/lib/adminGate.ts:5` (password in bundle); README documents both
- **Impact:** Per the README's own model: `select` is open, so all returns *and issue reports* (which can contain sensitive safety complaints attributable to a membership number) are world-readable; `update`/`delete` on `bag_returns` and writes to seasons/limits/members are possible with plain `fetch` calls, no password needed — the password gates the UI only. Also note `useSettings.load()` (`useSettings.tsx:87-91`) *writes* a seasons row as a side effect of any anonymous page load if the active season row is missing.
- **Fix (cheap, when convenient):** Move admin mutations behind a Postgres RPC that takes the password and checks it server-side (hash in the DB), and restrict `issue_reports` select to that path. Full fix remains Supabase Auth. Also consider removing the plaintext password from the README if the repo ever becomes public.

**[P2] Member identity depends on exact string match**
- **Location:** `src/components/Leaderboard.tsx:28-47` (grouped by raw `membership_number`); Submit trims whitespace only (`SubmitScreen.tsx:116`)
- **Impact:** "07" and "7" (or a stray letter) split one member into two leaderboard rows and two directory entries. Edits via `EditReturn` bypass even the trim on the hint display.
- **Fix:** Normalise on save (strip leading zeros for pure numerics) or validate the format (`/^\d+$/` if numbers are always numeric).

### P3 — polish

1. **Layout-property transitions** (detector): `transition: width/height` on `.bar-fill`, `.month-bar`, `.limit-fill` (`styles.css:670, 719, 1042`). One-shot animations on small elements — verified low impact. Use `transform: scaleX()` with `transform-origin: left` if you want it clean.
2. **No `prefers-reduced-motion` handling**; `window.scrollTo({ behavior: 'smooth' })` (`SubmitScreen.tsx:139`, `ReportIssueScreen.tsx:57`, `MembersTab.tsx:49,169`) ignores the preference. One media query + `behavior: 'auto'` fallback.
3. **No dark mode / `color-scheme`** — the token system makes a dark variant cheap; at minimum declare `color-scheme: light` so iOS doesn't half-invert form controls.
4. **Touch targets:** `.step-btn` 40×40 (`styles.css:341-343`) and `.btn-link` row actions ~24 px tall — passes WCAG 2.5.8 (24 px) but below the 44 px comfort bar for a cold-hands, gloved-use app. Cheap: bump `.step-btn` to 44 px and add padding to `.btn-link`.
5. **No code splitting:** every member downloads the whole admin panel (`App.tsx:5`). `React.lazy(() => import('./screens/AdminScreen'))` would cut a meaningful slice of the 403 kB bundle for the 95 % of visits that only submit.
6. **Leaderboard table semantics:** add `scope="col"` and a visually-hidden `<caption>`.
7. **Emoji as icons** (`TabBar.tsx:4-6`, ⬇/↻/🛑/⚠️ sprinkled in admin): renders differently per platform and greys inconsistently (`filter: grayscale`). Inline SVGs would sharpen the shell; the club-app tone is otherwise a fair call.
8. **Manifest:** `orientation: "portrait"` locks the installed app out of landscape (the leaderboard benefits from landscape); `background_color #f4f6f3` doesn't match `--bg #eef1ec`; combined icon `purpose "any maskable"` risks cropping — split into two entries.
9. **UTC vs local "today":** `AdminOverview.tsx:103` stamps the CSV with `toISOString()` (UTC) while everything else uses local `todayISO()` — a late-evening export is dated tomorrow.
10. **`MembersTab` fetches every return across all seasons** just to list distinct numbers (`MembersTab.tsx:9`) — fine at club scale, noted for awareness.
11. **No offline story** for a field app: the manifest invites install but there's no service worker; a submit with no signal errors (input is preserved — good). A background-sync queue is the natural future enhancement.

## Patterns & systemic issues

- **Errors are swallowed in the settings/totals layer but surfaced in the list layer.** `useBagReturns`/`useIssueReports` model errors properly; `useSettings`/`useSeasonTotals` ignore them entirely. One convention should win — the modelled one.
- **Validation lives only on the Submit path.** Edit and Settings forms trust input the Submit form wouldn't (`EditReturn`, `SettingsView`, `parseLimit`).
- **Duplicated season logic (client + DB trigger) is a standing sync burden** — documented in both places, which is the right mitigation, but any future change must touch both. A comment-tested fixture (same dates through both paths) would cheaply lock it.

## Positive findings

- **Accessibility baseline is genuinely good for a hand-rolled app:** implicit `<label>` wrapping on every field, `aria-label`s on steppers/switch/segmented, `role="radiogroup"/"radio"` with `aria-checked`, `role="alert"`/`"status"` banners, `aria-current` on tabs, `aria-live` on stepper values, `:focus-visible` outlines, `lang="en"`, sensible heading structure, real `<button>`s everywhere (no div-buttons).
- **Mobile craft:** safe-area inset on the fixed tab bar, 16 px input font to stop iOS zoom, `tabular-nums` on every figure, sticky first column + touch scrolling on the leaderboard, thumb-sized primary buttons.
- **Data integrity by design:** `total_shot` as a DB generated column and season filing via DB trigger can't drift from client bugs; CSV writes BOM + CRLF for Excel; `sessionStorage`/`localStorage` access is try/caught throughout.
- **No `innerHTML` anywhere; React escaping covers all member-supplied text.** Double-submit is guarded on all three write paths. Typecheck and production build are clean.
- **The README is honest** — the security model is stated plainly rather than oversold.

## Recommended actions (in order)

1. **[P1] `/impeccable harden`** — future-date cap, surfaced totals/settings errors, submit-time limit re-check, error boundary, edit/settings validation, CSV injection guard, cleared-date fallback.
2. **[P1] `/impeccable polish`** — muted-on-bg contrast token, switch focus ring, leaderboard `th` buttons + `aria-sort`, touch-target bumps.
3. **[P2] `/impeccable clarify`** — limit-typo feedback ("not a number" vs silent no-limit), tab-switch data-loss warning copy, offline/error messaging.
4. **[P3] `/impeccable optimize`** — lazy-load the admin screen; swap the three width/height transitions for transforms.
5. **[P3] `/impeccable adapt`** — dark-mode variant off the existing tokens, `prefers-reduced-motion`, manifest orientation/icon fixes.
