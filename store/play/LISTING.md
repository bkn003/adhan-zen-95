# Play Store release assets — Adhan Zen

## Files in this folder
- `feature-graphic.jpg` — 1024x500 feature graphic (crop/export from the 1024x512 source).
- App icon (512x512): use `public/app-icon-512.png`.
- Screenshots: capture 4-8 phone screenshots (min 1080x1920) of Home, Mosques, Ramadan schedule, Qibla, Quran, Notification settings.

## App name (max 30)
Adhan Zen — Prayer Times

## Short description (max 80)
Mosque prayer times with offline adhan and iqamah alarms that ring all year.

## Full description
Adhan Zen gives you your own mosque's prayer times — not calculated estimates.

- Pick your mosque or mohalla and see today's Adhan and Iqamah times instantly.
- Alarms ring at the exact Adhan and Iqamah minute, even with the app closed, after a restart, and with no internet — a full year of timings is stored on your phone.
- Snooze and loudness controls for the Adhan alarm.
- Monthly and Ramadan schedules with Sahar and Iftar, plus PDF and calendar export.
- Qibla compass, Tasbeeh, Zakat calculator, prayer tracker with Qada.
- Quran and Hadith libraries with clear recitation in your language, readable offline.
- Mosque announcements, Jummah topics, Jamaat countdown and attendance.
- 10 languages, including Tamil, Urdu, Hindi and Arabic.
- Mosque committees can log in and update their own timings for everyone.

## Category / tags
Lifestyle · Prayer times, mosque, adhan, Ramadan, Qibla

## Content rating
Everyone. No ads. No gambling. Donations link out to the mosque's own UPI or payment page.

## Data safety
- Location: used on-device to show nearby mosques and the Qibla direction; coarse location only, not sold.
- Account (optional email): only for mosque admins and saved preferences.
- Attendance check-in stores a device id and mosque, deletable on request.

## Build steps
1. Push the project to GitHub, then run the "Build Android APK" workflow (`.github/workflows/build-apk.yml`).
2. For a Play release, build an AAB: `cd android && ./gradlew bundleRelease` with your upload keystore configured in `android/gradle.properties`.
3. Upload `android/app/build/outputs/bundle/release/app-release.aab` to Play Console with the assets above.
