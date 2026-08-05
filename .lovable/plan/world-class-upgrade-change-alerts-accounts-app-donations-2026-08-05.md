# World-class upgrade: change alerts, accounts, app donations

## Is this a real app?

It is a real, working product, not a demo: live prayer data with CDN caching and offline fallback, per-mosque admin panels, super admin, private photo storage with signed URLs, reviews with moderation, events/RSVP, UPI donations per mosque, Quran reader, Qibla, Zakat, tracker, native Android alarms and background sync. What is missing for "world class" is trust and retention plumbing: real user accounts, reliable server-side change notifications, and a sustainability path. That is what this plan adds.

## 1. Weekly prayer-time change notifications (PWA + Android)

Prayer times switch on fixed ranges (1-5, 6-11, 12-17, 18-23, 24-month end). Users must be told when the new range differs from the previous one, with both old and new times.

Two layers, so alerts arrive whether or not the app is open:

- Server watcher (works with the app closed): a scheduled function keeps a snapshot of each mosque's published times per range. When a range's values change, it stores a change record and pushes an FCM notification to every device linked to that mosque as selected mosque or My Mohalla.
- Client diff (instant, offline-friendly): the existing sync engine already diffs a 10-day window. It gets extended to also diff the *range* level and to run for both the selected mosque and My Mohalla, then raise a local/web notification and log the change.

Notification content: mosque name, affected date range, and one line per changed prayer, e.g. `Fajr Iqamah 5:20 AM -> 5:15 AM`. Tapping opens the "Recent time changes" screen, which is extended to group changes by date range and show a history list instead of only the last sync.

## 2. Trust: accounts and gated actions (hybrid)

- Sign in with Google and with email + password. Password reset page included.
- Browsing prayer times stays open (important for a public utility and for SEO).
- Requires an account: reviews and reports, event RSVP, following mosques, notification settings, prayer tracker, Quran bookmarks, mosque admin, super admin.
- Anonymous sessions are replaced by real accounts where data is user-owned; a profiles table stores display name and avatar so reviews and RSVPs show a real identity instead of a device id.
- Visible trust signals: verified-mosque badge on mosques with an active admin, "last updated by mosque admin" timestamp on prayer cards, and a dismissible sign-in prompt on personalised surfaces.

## 3. Donations to support app development (super admin)

- Super admin panel gets an "App support" section: UPI ID, payee name, optional note, suggested amounts, enable/disable toggle.
- A card appears on the home page and inside every mosque page, visually distinct from the mosque's own donation card so nobody confuses the two.
- One-tap UPI deep links (GPay / PhonePe / Paytm / any UPI app) plus a QR fallback, same mechanism as mosque donations.
- Disclaimer shown on the card and in a details sheet: contributions support app development and hosting, they are voluntary, non-refundable, not a charitable/zakat donation, not tax-deductible, and unrelated to any mosque's own funds.

## 4. Further features for world-class standard (proposed, not in this build)

Ranked by impact: iOS build and App Store release; mosque admin web dashboard with bulk CSV import of yearly timings; Jamaat live status ("Iqamah in 5 min"); Islamic calendar with Ramadan/Eid countdowns and fasting tracker; audio adhan with muezzin choice per prayer; family/group sharing; Arabic and Urdu with full RTL; accessibility pass (screen reader, large text); analytics dashboard for mosque admins; verified-mosque approval workflow.

## 5. Costs and value (indicative, INR)

- Building this from scratch with an Indian agency/freelance team: roughly 8-15 lakh for a comparable PWA + Android app with admin panels, or 20-35 lakh with a studio and iOS included. Solo developer over 4-6 months: 3-6 lakh equivalent in time.
- Running cost at state scale (a few thousand mosques, 50k-200k monthly users): mostly free tier plus 3-8k/month for database, storage bandwidth and push at the upper end.
- Selling a single-state deployment: typically 2-6 lakh as a one-time license to a trust or federation, or 15-40k/month as a managed SaaS with support. A per-mosque model (100-300/month) usually earns more over time than a one-time sale.

These are market estimates, not a quote.

## Technical notes

- New table `prayer_time_snapshots` (location_id, month, date_range, values jsonb) and `prayer_time_changes` (location_id, date_range, field, old_value, new_value, detected_at) with owner-safe grants and RLS; changes readable by authenticated users, writes only from the service role.
- New scheduled edge function `prayer-change-watch` compares snapshots to current rows and calls the existing `_shared/fcm.ts` sender; cron via pg_cron + pg_net.
- `push_tokens` gains a reason/scope so a device can receive alerts for both selected mosque and mohalla.
- `src/native/syncEngine.ts` extended to diff by date range and to sync two mosques; `SyncChangesScreen.tsx` becomes a grouped history view.
- Auth: Supabase Google provider (configured in the Supabase dashboard) + email/password, `profiles` table with signup trigger, `/reset-password` route, and an `AuthProvider` guarding gated actions.
- App donation config stored in `app_settings` (public read of non-sensitive keys, service-role writes) and rendered by a new `AppSupportCard` component reusing the UPI deep-link helpers.
