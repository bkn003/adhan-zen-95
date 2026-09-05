# Roadmap

- [x] Complete authenticated support issue tracker with screenshots
- [x] Fix mosque donation settings navigation and UPI deep links
- [x] Persist preferred mosque/location and prayer payload for instant offline startup (local-date cache keys)
- [x] Add prayer-time history with Hijri dates and Ramadan filter
- [x] Group time changes by date range
- [x] Correct PDF Hijri/date ranges and 12-hour formatting
- [x] Align Settings section default collapse behavior
- [x] Improve multilingual Quran male voice selection
- [x] Google sign-in: correct redirect + clear message when provider is disabled
      (still needs Google enabled with credentials in Supabase Auth Providers)
- [ ] Validate real mosque Ramadan schedule, map, and exports on device data

## 2026-09-05
- [x] Fix date-range labels everywhere (PDF/ICS exports, prayer history, Ramadan schedule, mosque details, admin panel, offline banner) — stored values carry a month suffix ("1-5 Apr") which broke parsing; now snapped to 1-5 / 6-11 / 12-17 / 18-23 / 24-month end.
- [x] Mosque database fields: timings source, Ramadan start/end dates, donation link on locations + super admin add-mosque form + edge function.
- [x] Offline-first: cache today's schedule and preferred mosque on all platforms (was native-only).
- [x] Verified Android alarm chain (exact alarms, boot/upgrade reschedule, +24h self-perpetuation, daily sync worker).
- [ ] Editing the new mosque fields for existing mosques in the admin panel.
