# Push Reminders (PWA + Android) and a Compact Settings Page

## 1. Prayer-time change alerts by mohalla — closed-app delivery

The backend watcher that diffs weekly timings and pushes alerts already exists and already targets both a user's selected mosque and their mohalla mosque. What is missing is the browser (PWA) side: only Android devices currently register a push token.

Work:
- Add Firebase Web Push (Firebase JS SDK + `public/firebase-messaging-sw.js`) so installed/open-in-browser PWA users get a real FCM token.
- Register web tokens into the existing token table with `provider: 'fcm-web'`, tied to the signed-in user, selected mosque and mohalla mosque, so the existing watcher reaches them with no server changes.
- Background messages are shown by the messaging service worker, so alerts arrive with the app closed (browser must be running in the background — standard web-push behaviour on Android; iOS requires the app to be added to the Home Screen).
- Clean-up on sign-out / disable, plus refresh handling when the token rotates.

Firebase config values (web app config + VAPID public key) come from you; they get stored as project secrets, with the publishable web config kept in the client where required.

## 2. Adhan + pre-prayer reminders for every salah

Delivery uses both paths, deduplicated so nobody gets two alerts:

- Android: keeps exact local alarms (already implemented) — fires offline, no server needed.
- PWA: a new scheduled edge function runs every minute, looks up each subscribed user's mosque timings for today, and pushes the adhan alert plus the "X minutes before" reminder at the right moment. Respects quiet hours, per-prayer toggles and the chosen lead time already stored in reminder preferences.
- A per-token flag marks devices that self-schedule (native) so the server skips them.

New settings controls: lead time (5/10/15/20/30 min), per-prayer on/off (existing), and a single "Send test reminder" that verifies the whole chain.

## 3. Compact settings page

Group the current ~10 stacked cards into 5 collapsible sections, keeping every existing control and behaviour:

```text
Mosque & Location   -> location, my mohalla
Reminders           -> adhan alerts, per-prayer alerts, lead time, quiet hours/DND, smart/weather reminders, test button
Tools               -> qibla, zakat, quran, tasbeeh, qaza, compare, transparency
Sync & Data         -> background sync status, offline cache, privacy & data controls
Account & Admin     -> sign in/out, mosque admin, super admin (role-gated as today)
```

Only the first relevant section is expanded by default; the header stays compact.

## 4. Ideas to reach world-class standard

Shortlist, ordered by impact — not built in this pass unless you pick them:
1. Reliability dashboard: per-mosque "timings verified/updated N days ago" plus alert delivery receipts.
2. Ramadan hub: countdown, sahar/iftar cards, taraweeh tracker, community iftar notices.
3. Family/group mode: one account managing reminders for multiple household devices.
4. Jamaat attendance insights: streaks, monthly report, mosque-level anonymous stats.
5. Accessibility & offline-first polish: full offline Quran audio, large-text mode, screen-reader labels across all languages.
6. Mosque admin mobile-first console with approval workflow for timing edits.

## Technical notes

- New: `public/firebase-messaging-sw.js` (messaging worker, separate from the existing app service worker), `src/native/webPush.ts` for token lifecycle, `supabase/functions/prayer-reminders/index.ts` for the per-minute sender.
- Uses the existing `_shared/fcm.ts` HTTP v1 sender and the existing token table; token rows gain provider/self-scheduling and lead-time context.
- Cron scheduling is set up with the project-specific URL and key via the insert path, not a shared migration.
- `SettingsScreen.tsx` refactored into section components; no logic changes to the controls themselves.
