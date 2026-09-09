# Mobile App Report — PWA vs Capacitor vs React Native

## Decision
Keep the current **Capacitor** Android app. The alarm engine is already native
(exact alarms, self re-arming, rebuilt after reboot and app update). React Native
would mean rewriting every screen with no alarm benefit. "React Native with
Capacitor" is not a real combination — they are alternative wrappers for the same job.

## Comparison

| Capability | PWA (browser install) | Capacitor (current) | React Native |
| --- | --- | --- | --- |
| Alarm at exact Adhan/Iqamah minute | No — only while a tab lives | Yes | Yes |
| Alarm with app fully closed | No | Yes | Yes |
| Alarm after phone restart | No | Yes | Yes |
| Alarm offline for a year | No | Yes | Yes |
| Full-volume adhan on lock screen | Limited | Yes | Yes |
| Home-screen widget | No | Yes (built) | Yes |
| Do-not-disturb during Jamaat | No | Yes (built) | Yes |
| Play Store / App Store listing | No | Yes | Yes |
| Reuses current screens | Yes | Yes | No — full rewrite |
| Work to reach today's state | done | done | months |
| Offline Quran & Hadith reading | Yes | Yes | Yes |

The browser version stays available for people who don't install the app; it
simply cannot ring when closed.

## Year-long offline alarms (implemented)
- `src/native/yearAlarms.ts` builds 12 months of day-by-day Adhan/Iqamah slots
  from the CDN month JSONs (`force-cache`, never direct Supabase reads) and
  caches them on the phone.
- The native `AdhanNative.setYearSchedule` stores that year in SharedPreferences.
- `YearAlarmPlanner` keeps a rolling **30-day** window of exact alarms armed
  (5 prayers x 2 phases x 30 days = 300 alarms, within Android limits) and
  refills it:
  - every time an alarm fires (`AlarmReceiver`),
  - after boot / app upgrade / time change (`BootReceiver`),
  - on the daily `PrayerSyncWorker`.
- Per-prayer, per-phase notification toggles are honoured before arming.
- Notification settings has **Download a year of timings** with a last-synced line.

## Build the APK yourself
1. Export the project to GitHub, then `git pull`.
2. `npm install`
3. `npx cap add android`
4. `npm run build`
5. `npx cap sync android`
6. `npx cap run android` (Android Studio installed) or
   `cd android && ./gradlew assembleRelease` for an APK in
   `android/app/build/outputs/apk/release/`.

iOS needs a Mac with Xcode: `npx cap add ios`, `npx cap sync ios`, `npx cap run ios`.

## Required device permissions
- Notifications (Android 13+).
- Alarms & reminders (exact alarms, Android 12+).
- Battery optimisation exemption — prompted in-app.
- Do Not Disturb access, only for the Jamaat silence feature.

Read the Lovable blog post on Capacitor mobile development for more background.
