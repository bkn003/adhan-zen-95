# Complete support, donations, offline prayer data, history, exports, auth, and Quran audio

## Scope

- Finish the authenticated support tracker so signed-in users can submit issues, attach compressed screenshots, and review their ticket status in-app.
- Wire Settings mosque donations to the selected mosque’s real donation details and page; repair UPI URI generation with safe encoding and provider-specific fallback behavior so failed app launches do not strand users.
- Persist the preferred mosque/location and the last successful month/date-range prayer payload in IndexedDB, then hydrate startup from that cache before refreshing from the CDN.
- Add a prayer-time history screen for the selected mosque with Hijri dates, month navigation, and a Ramadan-only filter.
- Correct recent-change rendering so one database schedule range appears once rather than being expanded into duplicate daily cards.
- Correct monthly PDF/ICS exports: real mosque/month metadata, accurate calendar-aware ranges, valid Hijri labels, and 12-hour AM/PM times. Validate exports for multiple real mosques.
- Validate Ramadan schedule and mosque map using actual stored mosque data; show fasting, Taraweeh, and Eid entries only when they match real dates/data.
- Fix Google sign-in’s frontend callback/error handling and show an actionable message when Google is disabled. Google must also be enabled with credentials in Supabase Authentication Providers; no secret will be added to client code.
- Make Mosque & Location use the same default collapsed/wrapped behavior as every other Settings section and remove the current ref warning.
- Prefer strong natural male device voices for each Quran translation language, with deterministic voice selection and a clear fallback when no high-quality native voice is installed. Keep downloaded Arabic recitation and offline text/audio behavior unchanged.

## Technical details

- Reuse the existing `support_tickets`, private `support-screenshots` bucket, profile/auth context, donation RPC, CDN prayer source, and IndexedDB stores rather than introducing parallel systems.
- Keep sensitive donation banking fields behind the existing secure RPC/edge-function path.
- Add focused navigation entries for History and Support without changing the bottom navigation structure.
- Test signed-in support submission, screenshot upload, selected-mosque donation routing, offline reload, grouped history/change rows, Google error handling, and mobile Settings behavior.
- Generate and inspect PDF/ICS output for at least two mosques and verify date ranges, Hijri labels, Ramadan fields, and AM/PM formatting.
