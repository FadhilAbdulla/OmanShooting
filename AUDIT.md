# Audit — 4 October 2026

Full review of the Phase One MVP covering security, correctness of the booking and payment flows, performance under concurrent load, and UI. Every fix below was verified against a running production build: 45 scripted checks plus a 500-user concurrency test.

## Fixed

### Critical / high

| # | Area | Finding | Fix |
|---|---|---|---|
| 1 | Data integrity | Timestamps were stored without a time zone, but the raw-SQL hold/expiry checks compared them with `now()`, which follows the DB server's time zone. On a server not set to UTC, holds expired hours early or late, and cart countdowns showed +4h. | All timestamp columns migrated to `timestamptz`, converting existing values explicitly as UTC. |
| 2 | Security | Demo shortcuts (OTP shown on screen, sandbox "pay now" page) were controlled by an env flag that also worked in production. Anyone could sign in as any member, including admins, or confirm bookings without paying. | New `DEMO_MODE` flag. In production both shortcuts are off unless it is set, and a visible demo banner is shown on every page when it is. Card checkout is refused up front if no real gateway is configured. |
| 3 | Privacy (PDPL) | `/verify/M<number>` showed each member's name and photo, and member numbers are sequential, so the whole membership could be scraped. | The QR now carries an HMAC-signed token (`M123.<sig>`). Unsigned or tampered codes are rejected on the verify page and at check-in. |
| 4 | Payments | A Thawani payment arriving after the hold expired failed with "no longer payable". The shooter paid but had no booking. | A late payment re-takes the targets if they are still free; otherwise the order becomes **Refund due**, shown at the top of the Payments queue with a "Mark refunded" action. The check is all-or-nothing across a multi-target order. |
| 5 | Booking | The attempt limit and `maxParticipants` were checked outside the transaction, so parallel taps could exceed them. `maxParticipants` was not enforced at all. | Per-shooter advisory lock plus checks inside the claim transaction. `maxParticipants` is enforced under a per-competition lock, taken only when a cap is set. |
| 6 | Auth | The shooter could edit their date of birth after registration and move into a different age category. | DOB is locked once recorded. |

### Medium

| # | Area | Finding | Fix |
|---|---|---|---|
| 7 | Auth | Revoked staff roles still opened admin pages until the session expired; pages trusted the roles inside the cookie. | Page guards re-read roles from the DB on every request. |
| 8 | Auth | Sessions could be kept alive forever by activity. | 12-hour absolute lifetime on top of the 60-minute idle timeout. |
| 9 | Auth | OTP: parallel guesses could exceed the 5-attempt limit, there was no hourly cap, and the response revealed whether a civil ID was registered. | Atomic attempt counting, single-use consumption, a cap of 3 codes per minute and 10 per hour, and an identical response for unknown civil IDs. |
| 10 | Security | Open redirect through `?next=` on login and registration. | Only same-site relative paths are accepted. |
| 11 | Security | Excel exports allowed formula injection (e.g. a name starting with `=`). | Such cells are prefixed with `'`. |
| 12 | Security | Uploaded photos and receipts weren't type-checked. | Only image data URLs (plus PDF for receipts) are accepted. |
| 13 | Booking | A cash or transfer order past its deadline showed as free on the board, but tapping it said "taken" until the sweeper ran (≤15 s). | The claim expires the stale order inline. |
| 14 | Booking | The cancellation limit counted abandoned payments, staff cancellations and no-show replacements against the shooter. | A new `selfCancelled` flag; only the shooter's own cancellations count. |
| 15 | Booking | Bookings could be moved into a final group, an already-started group or a blocked target. | Guarded. |
| 16 | Real-time | The booking board could miss an update when two groups changed within the debounce window. | It refreshes on any change for the day. |
| 17 | Real-time | A dropped LISTEN connection could emit an unhandled `error` and crash the server. | Safe reconnect. |
| 18 | Performance | With N viewers on a board, every change caused N database reads. | An in-process micro-cache, invalidated instantly by the same NOTIFY that pushes updates, with a generation counter to prevent stale writes. Plus client jitter and new indexes. |
| 19 | Performance | Middleware re-signed the session cookie on every request, including bursts of booking calls. | It refreshes at most every 5 minutes. |

### Low

- **Dashboard date:** "today" was wrong between 00:00 and 04:00 Muscat time. It now uses the Muscat date.
- **Clone slugs:** cloning twice produced a mangled slug (`…-2027` became `…-2`).
- **Error codes:** responses always carried `BAD_REQUEST`. The code now matches the HTTP status.
- **Spelling:** the traditional rifle is the *Saktoun* (الصكتون), not "Saktool". Corrected in code and by a data migration.
- **Cron endpoint:** can now be protected with `CRON_SECRET`.
- **Leaderboard:** state updates no longer have side effects.

## Still open (before go-live)

1. **SMS provider** for OTP. Until one is connected, the platform can only run in `DEMO_MODE`.
2. **Live Thawani keys**, plus webhook signature verification (today the return URL is re-verified against the Thawani API).
3. **File storage:** photos and receipts are stored as data URLs in Postgres. Move them to private object storage with signed URLs (SEC-07).
4. **Per-IP rate limiting** on OTP, at the edge or WAF (HOST-04).
5. **ID-card OCR** (MEM-02/03), electronic invoices (PAY-08), and a unit-test suite with ≥70% coverage (TEST-06).
6. **Session revocation:** logout clears the cookie, but tokens are stateless. Add a session table if instant server-side revocation is required.
7. **Photography:** landing-page images are Unsplash stock (`public/images/CREDITS.md`). Replace them with the Committee's own championship photos.
