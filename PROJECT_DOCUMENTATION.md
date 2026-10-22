# RTCMO Padel Booking — Project Documentation

> Written 2026-10-12 against commit `552e89f` (+ one uncommitted fix, see §14).
> Goal: a complete, honest reference for this project and a blueprint for building similar ones.
> Where something is **verified from code**, **inferred**, or **unverified**, it says so.
> Sections 11–13 (limitations, recommendations, ideas) are deliberately unflattering.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Tech stack & versions](#2-tech-stack--versions)
3. [Repository layout](#3-repository-layout)
4. [Environment variables](#4-environment-variables)
5. [Data model (Supabase)](#5-data-model-supabase)
6. [Business rules](#6-business-rules)
7. [Features, end to end](#7-features-end-to-end)
8. [API reference](#8-api-reference)
9. [Security model](#9-security-model)
10. [Deployment & operations](#10-deployment--operations)
11. [Known limitations & defects](#11-known-limitations--defects)
12. [Recommendations (prioritised)](#12-recommendations-prioritised)
13. [Feature ideas](#13-feature-ideas)
14. [Corrections to earlier statements](#14-corrections-to-earlier-statements)
15. [Blueprint: reusing this for a similar project](#15-blueprint-reusing-this-for-a-similar-project)
16. [Change history](#16-change-history)

---

## 1. What this is

An online court-booking site for the **Royal Tennis Club de Mohammédia (RTCMO)** padel section: 3 courts, 90-minute slots, French-language UI. Players pick a court, date and slot, enter details, and receive a booking reference. **Payment is made at the club** — there is no online payment. Staff manage reservations in a password-protected `/admin` panel. Players can look up and cancel their own bookings (guest lookup modal or logged-in drawer).

**Single-tenant, single-venue.** Courts, hours and prices are constants in code, not database rows.

## 2. Tech stack & versions

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js **16.3.4** (App Router) | `AGENTS.md` warns this version has breaking changes vs. older Next; read `node_modules/next/dist/docs/` before changing framework-level code. |
| UI | React **19.2.8**, framer-motion 13, lucide-react 1.x | |
| Styling | Hand-written CSS in `src/app/globals.css` (~32 KB) + heavy inline `style={{}}` | No Tailwind, no component library. |
| Dates | date-fns 4 (+ `fr` locale) | |
| Backend | Next.js Route Handlers (`src/app/api/**`) | No separate server. |
| Database/Auth | Supabase (Postgres + Supabase Auth) via `@supabase/supabase-js` 2.x | |
| Hosting | Vercel (auto-deploy from `main`) | |
| Language | TypeScript 5 (`strict` expected; not re-verified) | |
| Lint | ESLint 9 + `eslint-config-next` | **Never run during this work** (permission declined) — lint status unknown. |
| Tests | **None** | |

## 3. Repository layout

```
RTCMO/
├─ AGENTS.md / CLAUDE.md          Agent rules (Next.js "not the Next you know" notice)
├─ .env.example                    Env var template (committed)
├─ .env.local                      Real secrets (git-ignored)
├─ next.config.ts                  Empty config
├─ supabase_fix_cancelled_slots.sql   Migration: partial unique index (RUN by owner)
├─ supabase_lock_bookings.sql         Migration: enable RLS, drop policies (run status UNVERIFIED)
├─ public/                         logo_nobg.png, two large JPG hero images, unused default SVGs
└─ src/
   ├─ app/
   │  ├─ layout.tsx               Root layout: Geist fonts, French lang, SEO title/description
   │  ├─ page.tsx                 Public booking flow (~1,000 lines, single client component)
   │  ├─ ManagePanels.tsx         "Gérer ma réservation" modal + "Espace Joueur" drawer
   │  ├─ globals.css              Design tokens + all page CSS
   │  ├─ reset-password/page.tsx  Supabase password-recovery landing page
   │  ├─ admin/{layout,page}.tsx  Admin panel (noindex), single client component
   │  └─ api/
   │     ├─ availability/route.ts  GET booked slots (public)
   │     ├─ book/route.ts          POST create booking (public)
   │     ├─ manage/{lookup,mine,cancel}/route.ts   Player self-service
   │     └─ admin/{login,logout,stats,bookings,bookings/[id]}/route.ts
   └─ lib/
      ├─ constants.ts            Courts, slots, date helpers, price
      ├─ bookingPolicy.ts        Cancellation rule, phone match, throttle, public-shape mapper
      ├─ adminAuth.ts            Admin password check + HMAC session cookie
      ├─ userAuth.ts             Verify Supabase bearer token → user
      ├─ supabase.ts             Anon (browser-safe) client
      └─ supabaseAdmin.ts        Service-role client (server only)
```

Housekeeping debt: `package.json` name is still `tmp-app`; two ~4 MB JPG duplicates and `Logo.jpg`/`logo_nobg.png` sit in the repo root (the root JPGs are untracked); README is mostly create-next-app boilerplate.

## 4. Environment variables

| Variable | Exposed to browser? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes (by design) | Public client key; used for Supabase Auth in the browser and for verifying user tokens server-side |
| `SUPABASE_SERVICE_ROLE_KEY` | **never** | Bypasses RLS. Used by every route that touches `bookings` |
| `ADMIN_PASSWORD` | no | Single shared admin password |
| `ADMIN_SESSION_SECRET` | no | HMAC key signing the admin cookie |

Must be set in **both** `.env.local` and Vercel (Production). Changing them requires a restart/redeploy. Verified this session: all five exist locally and the two Supabase keys carry the roles `anon` and `service_role` respectively. Vercel's values were **not** checked.

## 5. Data model (Supabase)

The original `CREATE TABLE` was never in this repo. The schema below is **inferred from code**; confirm against the live database before relying on it.

**`bookings`**

| Column | Type (inferred) | Notes |
|---|---|---|
| `id` | bigint/int, PK | Admin routes only accept numeric ids |
| `court_id` | int | 1–3 |
| `booking_date` | date or text `yyyy-MM-dd` | |
| `time_slot` | text `HH:mm` | One of 10 fixed starts |
| `player_count` | int | 2 or 4 (validated server-side) |
| `total_price` | numeric | **Set server-side** from date (see §6) |
| `full_name`, `phone`, `email` | text | **No format validation** |
| `address` | text | Legacy; always written as `""` |
| `other_players` | text[] or jsonb (unknown) | Teammate names, optional |
| `booking_ref` | text | `RTM-` + 6 chars; uniqueness constraint **unconfirmed** |
| `status` | text, NOT NULL, default `'pending'`, CHECK in (`pending`,`paid`,`cancelled`) | Added by migration; the migration script itself is **not in this repo's `main`** |
| `created_at` | timestamptz | |

**Required index** (applied by the owner via `supabase_fix_cancelled_slots.sql`):
```sql
CREATE UNIQUE INDEX unique_active_booking
ON bookings (court_id, booking_date, time_slot) WHERE status != 'cancelled';
```
This is what makes double-booking impossible *and* lets cancelled slots be rebooked. The script drops all pre-existing unique constraints on `bookings` — including any on `booking_ref`, if one existed. **Check whether `booking_ref` is still unique** (see §11).

**Auth users** live in Supabase Auth (`auth.users`), separate from `bookings`. There is no foreign key between them; the link is the **email string**.

**RLS:** `supabase_lock_bookings.sql` removes all policies, enables RLS and revokes anon/authenticated privileges. Whether it has been run is **unverified**. Check with `select * from pg_policies where tablename='bookings';` (0 rows = locked).

## 6. Business rules

| Rule | Value | Where |
|---|---|---|
| Courts | 3: Terrain 1 *Vue Panoramique* (indoor), 2 *Court Central* (indoor), 3 *Côté Jardin* (outdoor) | `constants.ts` |
| Slots | 08:00, 09:30, 11:00, 12:30, 14:00, 15:30, 17:00, 18:30, 20:00, 21:30 (90 min; last ends 23:00) | `constants.ts` |
| Price | **200 MAD weekdays, 240 MAD Sat/Sun, per court** (not per player) | `getBookingPrice()` server-side; **also hard-coded again in `page.tsx`** |
| Booking window | Rest of current month; in the last 7 days of a month, through the end of next month | `page.tsx` (`maxDate`) — **client only, not enforced by API** |
| Payment | At the club; staff mark `paid` | Admin panel |
| Statuses | `pending` (default) → `paid` or `cancelled` | |
| Player self-cancel | Only `pending`, and only until **2 h** before start (`CANCEL_CUTOFF_HOURS`), club time `Africa/Casablanca` | `bookingPolicy.ts` |
| Admin | Can set any status, edit name/phone/email/player count, delete | |
| Cancelled slots | Immediately bookable again | availability filter + partial unique index |

## 7. Features, end to end

### 7.1 Public booking flow (`/`, `page.tsx`)
1. **Step 1 – Account.** Two choices: *Membre du Club* (log in with Supabase email+password, with *forgot password*) or *Nouveau Joueur* (**creates a Supabase account** — name, phone, email, password). **There is no true guest checkout** despite the label.
2. **Step 2 – Court & slot.** Pick court; classic month calendar or weekly grid; booked slots fetched from `/api/availability` and disabled.
3. **Step 3 – Players.** 2 or 4 players; optional teammate names.
4. **Step 4 – Review → confirm.** Posts to `/api/book`.
5. **Success.** Shows the `RTM-XXXXXX` reference. Handles `SLOT_TAKEN` (409) by returning to step 2 and refreshing availability.

> ⚠️ The review step tells users *"Vous recevrez une confirmation de votre réservation sur WhatsApp."* **No WhatsApp (or email) is sent by this application.** This is a false promise in the UI until messaging is built or the text is changed.

### 7.2 Password reset
`resetPasswordForEmail` redirects to `/reset-password`; a fallback effect in `page.tsx` forwards `type=recovery` links that land on `/`. Requires the production URL in Supabase → Auth → URL Configuration (not verified).

### 7.3 Player self-service
- Header buttons: **Gérer ma réservation** (modal) and **Espace Joueur** (drawer; shows first name when logged in).
- **Modal (no login):** reference + phone → `/api/manage/lookup`. Shows booking card with *Annuler* (two-step confirm) if cancellable, otherwise the reason.
- **Drawer (logged in):** tabs *À venir* / *Historique*, cancel from either. Sends the Supabase access token as `Authorization: Bearer`.
- Phone matching compares the last 9 digits (ignores `+212`/`0`/spaces).

### 7.4 Admin panel (`/admin`)
Password login (HMAC cookie, 8 h). Dashboard: today/week/month/total counts and "revenue", court utilisation today, today's schedule, recent activity. Reservations: server-side pagination, search (name/phone/email/ref), filters (date/court/status), inline status dropdown, inline edit, delete with confirm. `noindex` via `admin/layout.tsx`, not linked from the public site.

## 8. API reference

| Method & path | Auth | Purpose | Notes |
|---|---|---|---|
| `GET /api/availability?court_id&date` or `&start_date&end_date` | none | Booked slots (cancelled excluded) | Returns `{bookedSlots}` or `{bookedSlotsByDate}` |
| `POST /api/book` | none | Create booking | Validates court, slot, date format, past *date*, `player_count∈{2,4}`; price computed server-side; `409 SLOT_TAKEN` on unique violation |
| `POST /api/manage/lookup` | ref+phone | Fetch one booking | Throttled 10/10 min/IP; identical 404 for "not found" and "wrong phone" |
| `GET /api/manage/mine` | Bearer token | List caller's bookings | Matched on account email (exact, case-insensitive) |
| `POST /api/manage/cancel` | Bearer token **or** ref+phone | Cancel own booking | Enforces owner, `pending`-only, 2 h cutoff; update guarded by `.eq("status","pending")`; throttled 20/10 min/IP |
| `POST /api/admin/login` | password | Set session cookie | Throttled 5/15 min/IP |
| `POST /api/admin/logout` | cookie | Clear cookie | |
| `GET /api/admin/stats` | admin cookie | Dashboard data | Loads **all** bookings into memory |
| `GET /api/admin/bookings` | admin cookie | Paged/filtered list | |
| `PATCH /api/admin/bookings/[id]` | admin cookie | Update status/name/phone/email/player_count | Only `status` is validated |
| `DELETE /api/admin/bookings/[id]` | admin cookie | Hard delete | No audit trail |

## 9. Security model

**Trust boundaries**
- Browser → API routes → Supabase using the **service-role key**. Browser code only uses the anon client for Supabase *Auth* calls (login, signup, reset).
- Admin identity = possession of a valid HMAC-signed cookie `rtcmo_admin_session` (`httpOnly`, `sameSite=lax`, `secure` in production, 8 h). Token = `expiresAt.hmac`. Password and signature comparisons are constant-time.
- Player identity (self-service) = valid Supabase JWT whose email equals the booking email, **or** knowledge of booking ref + phone.

**Done well**
- Service-role key is server-only; no client component imports `supabaseAdmin`.
- Server-side price; server-side validation of court/slot/date/player count.
- Cancellation guarded against races; enumeration-resistant lookup responses.
- Admin routes all call `isAdminAuthenticated()` first.

**Not done / weak** → see §11.

## 10. Deployment & operations

1. Push to `main` → Vercel builds and deploys.
2. All five env vars must exist in Vercel (Production) and a redeploy follows any change.
3. Supabase: apply the status-column migration (not in this repo), `supabase_fix_cancelled_slots.sql`, and — only after the deploy is verified with the service key — `supabase_lock_bookings.sql`.
4. Supabase Auth: set Site URL and redirect URLs to the production domain; decide on **email confirmation** (see §11, item 5).
5. Rollback for the lock script: `ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY; GRANT ALL ON public.bookings TO anon, authenticated;` (does not restore deleted policies).

**Git state:** `main` is a clean fast-forward of `552e89f`. A branch `feature/booking-overhaul-admin-panel` on GitHub has **5 commits that diverged** (an alternative admin dashboard and `supabase/migrations/0001_booking_status_and_players.sql`) and were never merged; `feature/player-self-service` duplicates `main`. Neither has been reconciled or deleted.

No monitoring, error tracking, uptime checks, backups policy, or staging environment exist.

## 11. Known limitations & defects

Ordered roughly by impact. "Verified" = observed in code.

### Business-critical
1. **No verification of bookers → slot-hoarding is trivial.** Anyone can create unlimited `pending` bookings with fake names/phones and block every court. There is no OTP, no payment, no per-phone/email cap, and no expiry of `pending` bookings. *Verified.*
2. **No notification is ever sent**, yet the UI promises WhatsApp confirmation (§7.1). Players receive nothing off-screen; losing the reference means using the modal (needs phone) or the drawer. *Verified.*
3. **Same-day past slots are bookable.** The API rejects past *dates* only, not past *times* on today's date. Whether the client greys them out was not verified. *Verified (API).*
4. **No way for staff to block courts** (maintenance, tournaments, lessons) or create walk-in/phone bookings. Workaround: create dummy bookings via the public flow. *Verified.*

### Security
5. **Account email may be unverified.** Self-service by login trusts `user.email`. If Supabase "Confirm email" is **off**, anyone can sign up as `victim@x.com` and view/cancel that person's pending bookings. *Depends on a Supabase setting that was not checked.*
6. **Rate limiting is nearly ineffective on Vercel.** The limiter is per-process memory; serverless instances don't share it and reset on cold start. It slows a single warm instance only. `/api/book` has no limiter at all. *Verified.*
7. **Booking ref + phone is a weak guest credential.** Phones are guessable/known to acquaintances; refs come from `Math.random()` (≈10⁹ space, not cryptographic). Mitigated only by the weak limiter above.
8. **`supabaseAdmin` silently falls back to the anon key** if the service key is missing — masks misconfiguration and, with RLS closed, produces confusing failures instead of a clear startup error. *Verified.*
9. **Admin auth is one shared password**, no per-user accounts, no lockout beyond the weak limiter, no logout-everywhere (stateless tokens can't be revoked before expiry), no audit log of who cancelled/deleted what. *Verified.*
10. **Admin PATCH is under-validated:** `full_name`, `phone`, `email`, `player_count` accept any type/length. *Verified.*
11. **No input validation on public booking fields** (email/phone format, name length, `other_players` count/length). *Verified.*
12. **No CSRF token** on admin mutations; relies on `SameSite=lax` + JSON content type. Acceptable but not defence in depth.
13. **RLS lock script status unknown**; if not run, anyone with the public anon key may be able to read/modify `bookings` directly (depends on the original policies, which were never reviewed).

### Correctness / data
14. **Ref collisions are mis-reported.** A `23505` from a duplicate `booking_ref` would be shown to the user as "slot already taken". Worse, `supabase_fix_cancelled_slots.sql` dropped *all* unique constraints — if `booking_ref` had one, it is gone, and duplicate refs become possible. *Needs a DB check.*
15. **"Revenue" is not revenue.** Stats sum every non-cancelled booking, including `pending` (unpaid). Real collected cash = `paid` only. *Verified.*
16. **Stats use server time.** `new Date()` on Vercel is UTC, so "today/this week" can be off by up to a day relative to Morocco near midnight. The cancellation rule uses club time; stats and `isPastBookingDate` do not. *Verified.*
17. **Stats do not scale:** fetches every booking row on each dashboard load. Fine for hundreds, poor for tens of thousands. *Verified.*
18. **Price is defined twice** (`getBookingPrice` and hard-coded in `page.tsx`); the server wins, so a drift would show one price and charge another. *Verified.*
19. **Booking window and opening hours are client-side only.** The API will accept any future date. `isSunday()` exists but is unused (club is described as 7/7). *Verified.*
20. **Email as account link is brittle:** a player who changes their account email loses their history; bookings made as "guest-like" with a different email never appear in the drawer.
21. **Hard delete in admin** destroys history; cancelled status exists but delete bypasses it.
22. **Guest/"Nouveau Joueur" naming is misleading**; there is no guest path, and the spec of "member of the club" vs. "has a website account" is not the same thing (no club-membership check or member pricing exists).

### Engineering quality
23. **Zero automated tests; no CI.** Cancellation-time logic (`bookingPolicy.ts`) and booking races are exactly the code that should have tests. This session's verification was `tsc --noEmit` only; the UI additions were **not exercised in a browser** by me.
24. **`page.tsx` (~1,000 lines) and `admin/page.tsx` (~680) are monoliths** mixing state, data fetching, and markup; heavy inline styles alongside global CSS.
25. **Design inconsistency:** the brand colour is burgundy (`--primary:#8B1C22`) with gold accent, but `SummaryBadge` and parts of `ManagePanels.tsx` use hard-coded **green** tints (`rgba(15,81,50,…)`, `#047857`). Cosmetic, but visible.
26. **Mobile layout unverified:** the header now holds the step dots plus two buttons; may overflow on narrow phones.
27. **Accessibility not audited** (focus trapping in modal/drawer, keyboard escape, ARIA, contrast). The modal/drawer set `role="dialog"` but do not trap focus or close on `Esc`.
28. **Widespread `catch (err: any)`**; ESLint results unknown.
29. **Heavy assets:** ~3.5 MB and ~0.8 MB hero JPGs (next/image helps but sources are large); unused default Next SVGs in `public/`.
30. **French only**, hard-coded strings; no i18n (Arabic/English absent) and no dark-mode QA despite dark tokens in CSS.
31. **Documentation drift:** README doesn't mention self-service, the lock/migration scripts, or the schema; the status migration lives outside `main`.

## 12. Recommendations (prioritised)

**P0 — before relying on this in production**
1. **Confirm RLS state** and run `supabase_lock_bookings.sql` after a verified live booking. Review `pg_policies` first.
2. **Decide email confirmation** in Supabase Auth; turn it **on** if the drawer stays.
3. **Re-add/verify uniqueness of `booking_ref`** (`CREATE UNIQUE INDEX ... ON bookings(booking_ref)`) and retry ref generation on collision (separate from slot conflicts; use `crypto.randomInt`).
4. **Fix or remove the WhatsApp promise** in the review step. Fastest honest option: change the copy to "Conservez votre référence" until messaging exists.
5. **Block past times today** server-side (compare slot start to club-time now) and enforce the booking window in `/api/book`.
6. **Limit abuse:** cap active `pending` bookings per phone/email (e.g. 2), and auto-cancel `pending` that aren't confirmed within N hours (cron/Supabase scheduled function).

**P1 — soon**
7. Replace in-memory throttling with a shared store (Upstash Redis / Vercel KV / Supabase table) and add it to `/api/book`.
8. Server-side validation with a schema library (zod) for every public and admin input; trim and bound lengths.
9. Make `supabaseAdmin` **throw** when the service key is missing.
10. Admin: block-court/maintenance feature, manual booking creation, audit log, soft delete.
11. Correct the stats: `paid` revenue vs. `pending` expected; compute in club time; aggregate in SQL instead of in memory.
12. Single source of truth for price/hours/courts (import `getBookingPrice` into `page.tsx`; ideally move courts/prices to a DB table).
13. Add tests (Vitest) for `bookingPolicy`, `getBookingPrice`, and an integration test for double-booking/cancel races; add CI (typecheck + lint + test).
14. Reconcile or delete the diverged GitHub branches; commit the status migration into a `supabase/migrations/` folder; update README.

**P2 — polish**
15. Split `page.tsx`/`admin/page.tsx` into components/hooks; consolidate styling on design tokens; fix green/burgundy inconsistency.
16. Accessibility pass (focus trap, `Esc`, labels, contrast); test on small phones.
17. Add monitoring (Vercel Analytics, Sentry), Supabase backups/PITR, and OpenGraph/social metadata.
18. Rename package from `tmp-app`; remove unused assets and root-level image duplicates.

## 13. Feature ideas

**Player experience**
- WhatsApp/email confirmation and reminders (see cost caveat below); one-tap "share with partners" (`wa.me` link) and "add to calendar" (.ics).
- Court switcher inside the slot step; "next available slot" suggestion; waitlist for taken slots.
- Pre-filled form for logged-in players; saved partners; split-payment tracking between the 4 players.
- Recurring/weekly bookings; vouchers/packs; member vs. non-member pricing; peak/off-peak pricing.
- Matchmaking ("open match" looking for players by level); simple ratings/levels.

**Club operations**
- Per-staff admin accounts with roles; audit log; daily printable schedule; CSV export.
- Court blocking, tournaments/lessons, opening-hours exceptions (Ramadan, holidays), per-court pricing.
- Online payment (card / local gateway) with webhook-driven `paid` status and automatic expiry of unpaid holds.
- Reporting: occupancy by hour/court, no-show rate, revenue by day, top customers.
- No-show tracking and policy (strikes, deposits).

**Platform**
- Multi-club/multi-sport support by moving courts, hours and prices into tables (see §15).
- Arabic/English localisation; PWA install; push notifications.

> **WhatsApp cost caveat:** the per-message figures quoted earlier in this project's chat (≈0.02 USD per utility conversation) were **approximate and unverified**. Meta changed its pricing model (per-message billing for templates) and rates vary by country. Check Meta's current rate card for Morocco and whether your messages fall inside the free customer-service window before budgeting. A free fallback is transactional email (e.g. Resend's free tier — limits not re-verified).

## 14. Corrections to earlier statements

Things said earlier in this project's conversation that were wrong or overstated:

- **"layout.tsx still has default placeholder metadata."** Wrong: it has a branded title and description. What is missing is Open Graph/social metadata.
- **"Guest checkout."** Wrong: "Nouveau Joueur" creates an account; there is no guest booking path.
- **"Cancelled slot frees up immediately … with zero errors."** True only given the partial unique index was applied (the owner reported running it) *and* no other unique constraint conflicts remains; not independently tested.
- **Self-service was described as working; it was only type-checked**, not exercised in a browser or against the live database.
- **Rate limiting was presented as a mitigation**; on serverless it is weak (§11-6).
- **Initial claim that WhatsApp costs "less than 100 MAD/month"** rested on unverified rates (§13).
- **Uncommitted fix (this session):** `/api/manage/mine` used `.ilike("email", …)`, where `_`/`%` act as wildcards and could return another player's bookings. It now filters to an exact case-insensitive match. This change is **not yet committed or deployed**.

## 15. Blueprint: reusing this for a similar project

**Pattern:** *Next.js App Router + Supabase (Postgres) + server-only service-role access through Route Handlers + HMAC-cookie admin.*

**Reusable pieces (copy as-is)**
- `lib/adminAuth.ts` (HMAC session cookie), `lib/bookingPolicy.ts` (cutoff, phone match, public mapper), `lib/userAuth.ts`, the two Supabase clients, the `/api/manage/*` trio, the admin routes, `ManagePanels.tsx`.
- The **partial unique index** trick: uniqueness only among non-cancelled rows = race-free booking + rebookable cancellations.

**Do differently next time**
1. Put venues/resources, opening hours, slot length and prices in **tables**, not constants.
2. Start with RLS **enabled and no public policies**; all access via server routes + service key.
3. Add `zod` validation, shared rate limiting, tests and CI from day one.
4. Build notifications (email first) *before* promising them in copy.
5. Decide guest vs. account up front; if both, link bookings by `user_id`, not email, and require verified email.
6. Verify a booking via phone/email OTP or take a deposit to prevent slot hoarding; add pending-hold expiry.
7. Keep SQL migrations in `supabase/migrations/` inside the repo, including the base `CREATE TABLE`.
8. Compute everything date-related in the venue's timezone, on the server, in one helper.
9. Split big client components early; use tokens for all colours.

**Checklist to spin up a clone**
1. Create Supabase project → create `bookings` (schema in §5) → apply the partial unique index → enable RLS with no policies.
2. `cp .env.example .env.local` and fill all five variables; generate `ADMIN_SESSION_SECRET` with `openssl rand -hex 32`.
3. Edit `constants.ts` (courts, slots, prices, timezone in `bookingPolicy.ts`, club name/contact in `page.tsx`).
4. Replace logo/images; set brand tokens in `globals.css`.
5. Configure Supabase Auth URLs and email templates; decide email confirmation.
6. Deploy to Vercel with the same env vars; make a test booking, check `/admin`, test cancel.

## 16. Change history

Commits on `main` (oldest relevant → newest): admin API routes → `/admin` dashboard → README env docs → authentication, weekly calendar, pricing → forgot-password and `/reset-password` → recovery-link forwarding → flanking images and welcome-card redesign → **`552e89f`**: player self-service (modal, drawer, manage API), server-side pricing, admin login throttle, cancelled-slot availability fix, service-role routing for `/api/book` and `/api/availability`, and the two SQL scripts.
Uncommitted at time of writing: the `manage/mine` exact-email filter and this document.
