# Oman Traditional Shooting — Phase One MVP

National platform for the Oman Committee for Traditional Shooting: membership by civil ID, real-time target booking, payments, attendance/check-in, live scoring, results and an admin console for configuring championships.

Next.js 15 (App Router) · PostgreSQL + Prisma · Server-Sent Events · Tailwind.

## Run it

```bash
npm install
# Postgres must be running; adjust DATABASE_URL in .env (copy from .env.example)
npx prisma migrate deploy
npm run db:seed
npm run dev            # http://localhost:3000
```

Sign in with a civil ID. With `DEMO_MODE=1` the one-time code is shown on screen and card payments use a sandbox page; a banner says so on every page. Leave `DEMO_MODE` unset in production once an SMS provider and Thawani keys are configured.

See [AUDIT.md](AUDIT.md) for the latest security and correctness review.

| Role | Civil ID |
|---|---|
| Admin | `10000001` |
| Judge | `10000002` |
| Reception | `10000003` |
| Shooters | `20000001` – `20000040` (e.g. `20000004` is left-handed, `20000025` is female) |

The seed creates a **live** "Ministry Championship 2026" (started yesterday, with scores, today's groups ready for check-in and one unpaid cash booking) and a **draft** "National Day Cup 2026" to try the admin workflow.

## User journeys (verified in a real browser)

These journeys are driven end to end through the UI, with clicks and typing only, against a production build:

1. **New shooter onboarding:** *Become a member* → civil ID + one-time code (with *Resend*) → **scan ID card** (camera or upload, both sides at once; the text is read in the browser and the card images are never uploaded; a non-card photo or someone else's card is rejected with a retake prompt) → details pre-filled from the card, plus mobile, gender and dominant hand → circular profile photo → **digital membership card with QR** → *Book your first target*. In demo mode, *Demo: use a sample card* generates a clearly watermarked sample card for the verified civil ID.
1b. **Returning shooter sign-in** lands on **My bookings**: next booking, payments due, upcoming bookings with change/cancel, competitions open to them, history and the membership card. Staff land on the admin console; a sign-in started from *Choose target* returns to that board.
2. **Returning shooter, two attempts, bank transfer:** two groups in one cart (tiered price 4.000 + 2.000) → upload receipt → "We're checking your transfer" → admin approves in *Payments* → order shows *Confirmed*, with the same participant number on both.
3. **Change & cancel:** My account shows *Change target / time* and *Cancel* only inside the policy window (otherwise it explains why) → change mode on the board → atomic move → cancel releases the target.
4. **Competition day:** cash booking → desk scan says *payment pending* → *Collect & check in* shows the target number → judge types the score + Enter → live leaderboard updates.
5. **Admin setup:** new event (dates pre-filled) → preset → age/gender split → batch schedule → test-book the draft → *Publish* wipes test data → event appears on the landing page.

## How high-concurrency booking works

Each physical target in each group is a row in `Slot`. Claiming a target is **one atomic compare-and-set statement** (`src/lib/booking.ts → claimSlot`):

```sql
UPDATE "Slot" SET state='HELD', "userId"=$me, "holdExpiresAt"=now()+10min
WHERE id=$slot AND (state='FREE' OR (state='HELD' AND "holdExpiresAt" < now()))
RETURNING *
```

- Postgres row locking means that when N people tap the same target together, **exactly one** UPDATE matches. Everyone else gets 0 rows back and an instant `409 "someone just took this target"`. There are no long-held locks, queues or retries.
- Expired holds count as free **inside the WHERE clause**, so correctness never depends on a background job running on time. The 15-second sweeper (`instrumentation-node.ts`, or `GET /api/cron/sweep` on serverless) only tidies rows, expires unpaid orders (PAY-05) and pushes board updates.
- A unique index on `(groupId, userId)` stops one shooter holding two targets in a group. Tapping another target in the same group switches the hold in one transaction.
- Checkout locks the shooter's own holds with `SELECT … FOR UPDATE`, then turns them into `PENDING` (gateway / cash / transfer) and finally `BOOKED` on payment. Payment confirmation is idempotent, so repeated gateway callbacks are safe.
- **Real-time** (ARCHT-05): every write calls `pg_notify`. Each app instance keeps one `LISTEN` connection and fans updates out to its SSE clients (`/api/stream`). This works across several instances with no extra infrastructure; switch to Redis pub/sub if volume grows.

**Proof:** with the app running, `npm run load-test -- 500` fires 500 different shooters at one target at the same moment, then at a whole group:

```
Test 1: 500 shooters → target #2        status counts: { '200': 1, '409': 499 }
Test 2: 500 shooters → 8 free targets   status counts: { '200': 8, '409': 492 }
        ✅ no shooter holds two targets  ✅ no double booking
```

**Scaling to production:** run several Next.js instances behind a load balancer, put PgBouncer in front of Postgres (transaction mode for app queries; the single LISTEN connection per instance goes direct), add Redis for caching public pages (ARCHT-04), and keep the CDN in front of static assets (HOST-03).

## Admin: configuring a championship in a few clicks

`/admin/events` → **New event** creates a draft. Registration close defaults to the evening before the start date.

1. **Competitions**: quick-add presets (*Individual 10 shots*, *7 shots*, *3×10 series*, *Team of 3*). Each competition has:
   - gender, age range, firearm, individual vs team (team size)
   - shots per series and number of series
   - venue (indoor A/C / indoor / outdoor) and targets per group
   - left-hand targets (tap to toggle), enforce-hand rule
   - **price per attempt** (`5, 3` = 1st attempt 5 OMR, then 3 OMR from the 2nd onward), optional maximum attempts (blank = unlimited), max participants, finalists
2. **⚡ Age/gender split**: tick genders × age bands and the sub-competitions are created at once, inheriting the parent's settings. "Apply to sub-competitions" pushes later edits down.
3. **Schedule**: pick competitions and days, set first start, last end, duration and break. A live preview shows the groups; **Generate** creates every group and every target. Re-running skips groups that already exist.
4. **Draft = test mode**: admins can book the draft from the public site. Those bookings are flagged `isTest`, and **Publish** checks a checklist, wipes the test data and resets all targets automatically.
5. **Clone**: copies an event with all competitions and groups to a new date (e.g. next year's edition).

Status badges (Coming soon / Open / Closed) come from the registration dates, so no one has to flip them by hand.

## Attendance / check-in (`/admin/checkin`)

- Opens on the group that is running now (or the next to start).
- The scan box stays focused, so a **handheld QR scanner** works straight away. It accepts the member QR URL, `M123`, a civil ID or `#participant`. There is also a camera button that uses BarcodeDetector.
- A successful scan beeps and shows the photo, name and a **large target number** to direct the shooter. If they are booked in another group it says which one.
- The live roster grid stays in sync across several desks. Each target has one-tap actions:
  - **Present** / **Absent**
  - **Collect cash & check in** for unpaid cash bookings
  - **Replace** a no-show (only if no score is recorded — TOUR-10)
  - **Walk-in** on an empty target, with eligibility checked
- **Mark remaining absent** at group start, plus printed A4 target cards.
- Entering a score automatically marks the shooter present.

## Scoring & results (`/admin/scoring`)

- Score grid with keyboard flow: type, press Enter, and it moves to the next shooter. Entries auto-advance and auto-save.
- The X (inner ten) count is used for tie-breaks: total → X → last series backwards.
- **Generate final** creates the final group from the top N qualifiers and allocates targets, putting left-handers on L targets.
- **Publish official results** locks the scores. Unlocking for corrections is recorded in the audit log.
- Public outputs: live results at `/results/<slug>`, **TV mode** at `/tv/<slug>` (rotates competitions, SSE plus a 30-second refresh), A4 prints, and Excel (CSV with BOM so Arabic displays correctly) exports.

## RFP coverage (Phase One)

| Area | Implemented |
|---|---|
| MEM | Civil-ID + OTP login (salted SHA-256, expiring), registration, editable profile with civil ID locked, 512×512 circular photo, QR membership card + `/verify`, idle session timeout |
| BOOK | Colour-coded live board, mandatory manual target choice, left-hand targets, 10-min soft hold with countdown, multi-group cart, venue classes, eligibility filter, configurable cancellation policy, move booking |
| PAY | Thawani (real API when keys are set, built-in mock otherwise), bank transfer + receipt, cash on site, auto-expiry, review dashboard, daily reconciliation |
| TOUR | Event → Competition (→ sub) → Date → Group, tiered prices, batch scheduling, draft/publish, participant numbers, judge dashboard, scoring, attendance + replacement, finals, tie-breaks, locking, A4 prints, Excel export, TV mode |
| RBAC | Separate `UserRole` table, roles re-checked from the DB on every admin API call, role changes require a reason and are audited |
| STAT | Dashboard: members, bookings, revenue, pending payments, check-ins |
| FE | Responsive, Arabic/English toggle with RTL |

**Not yet in this MVP (next steps):**
- ID-card OCR (MEM-02/03)
- Real SMS / email / WhatsApp providers — adapters in `src/lib/notify.ts` currently log to the console
- Thawani webhook signature verification
- Moving photos and receipts from data URLs to private object storage with signed URLs (SEC-07)
- Full Arabic coverage of admin screens
- Electronic invoices (PAY-08)
- Unit-test suite (TEST-06)
- Local-cloud hosting, WAF and CDA approval (deployment work)

## Layout

```
prisma/schema.prisma        data model (Slot = one row per target)
prisma/seed.ts              demo data
scripts/load-test.ts        concurrency proof
src/lib/booking.ts          claim / release / checkout / confirm / cancel / move / walk-in / sweep
src/lib/admin.ts            presets, age-gender split, batch schedule, clone, publish checklist, test reset
src/lib/scoring.ts          leaderboard, tie-breaks, finals, result locking
src/lib/realtime.ts         Postgres LISTEN/NOTIFY → SSE bus
src/app/(site)/…            public site (events, booking board, cart, profile, results)
src/app/admin/…             admin console (events, check-in, scoring, payments, members, audit)
src/app/tv/[slug]           big-screen results
```
