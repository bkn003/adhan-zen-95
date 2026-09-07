# Alarms, Recitation Voice, Hadith Library, and Real Mosque Data

## 1. React Native vs Capacitor vs PWA — the short answer

You do **not** need to convert this app to React Native. Your project is already a Capacitor Android app with native alarm code written (exact alarms, self re-arming daily, rebuilt after reboot and after app update). React Native would mean rebuilding every screen from zero and would give you nothing extra for alarms. "React Native with Capacitor" is not a real combination — they are two alternative wrappers for the same job.

| Capability | PWA (browser install) | Capacitor (what you have) | React Native |
| --- | --- | --- | --- |
| Alarm at exact Adhan/Iqamah minute | No — only while a tab lives | Yes, exact alarms | Yes, exact alarms |
| Alarm with app fully closed | No | Yes | Yes |
| Alarm after phone restart | No | Yes | Yes |
| Alarm works with no internet, for a year | No | Yes | Yes |
| Full-volume adhan sound, lock screen | Limited | Yes | Yes |
| Home-screen widget | No | Yes (already built) | Yes |
| Do-not-disturb during Jamaat | No | Yes (already built) | Yes |
| Play Store / App Store listing | No | Yes | Yes |
| Reuses your current screens | Yes | Yes | No — full rewrite |
| Work to reach today's state | done | done | months |
| Offline Quran and hadith reading | Yes | Yes | Yes |

Decision in this plan: keep Capacitor. Keep the browser version too, for people who don't install the Android app; it just can't ring when closed. A written version of this comparison plus build instructions (how to produce the APK yourself) will be added as `MOBILE_APP_REPORT.md` in the project so you can read or share it.

## 2. Lifetime offline alarms for the selected mosque / mohalla

Today the phone stores today's timings and the alarms re-arm one day at a time. Change to:

- Store a full year of timings for the selected mosque and the mohalla mosque on the phone (the date-range table repeats monthly, so this is small).
- Pre-arm the next 30 days of Adhan and Iqamah alarms natively, and top the window back up to 30 days each time an alarm fires or the phone boots — so alarms continue for years with the app never opened and no internet.
- A "Download a year of timings" action in Notification settings, showing when it last synced.

## 3. Quran recitation voice quality

Fixes, keeping the existing voice engine (no robotic reading):

- Clean the text before it is read: drop verse numbers, footnote markers, brackets, asterisks, and stray punctuation so it never says "dot", "star" or symbol names.
- Read verse by verse with natural pauses instead of one long block, so pacing sounds human.
- Prefer the device's best-quality installed voice for the chosen language (enhanced/neural voices when present), with a clear note when the phone only has a basic voice, plus a one-tap hint on how to install a better voice.
- A speed control (slow / normal) and correct pausing at verse ends.

## 4. Hadith library

New Hadith section in the bottom navigation:

- Books: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik's Muwatta, and Riyad as-Salihin.
- Browse by book then chapter, search within a book, Arabic text with translation, bookmarks, and a share button.
- Language support follows the app languages; translations come from a public hadith source. Arabic, English and Urdu have full translations; other Indian languages will show English text where no translation exists for that book, and can be read aloud with the same improved voice.
- Everything you open is cached on the phone for offline reading.

## 5. Your real mosques

To add your mosques with their timings source and Ramadan dates I need the actual details. For each mosque, send: name, area/district, the address or map link, where the timings come from (committee, printed calendar, website), Ramadan start and end dates, and a donation link or UPI id if they want one. I will add them and confirm their timings load offline. I will not invent any mosque data.

## Technical notes

- Date ranges stay on the fixed 1-5 / 6-11 / 12-17 / 18-23 / 24-month-end scheme already used across the app.
- Year cache: extend `prayerStore.ts` with a per-location yearly schedule store plus snapshot reads; keep Cloudflare CDN `force-cache` fetching, never direct Supabase reads.
- Alarms: extend `AlarmScheduler`/`AlarmReceiver` to keep a rolling 30-day window of pending exact alarms from the persisted yearly data, and refill on `AlarmReceiver` fire, `BootReceiver`, and daily `PrayerSyncWorker`.
- Voice: add a text sanitiser and per-verse queued utterances in `quranEditions.ts`; extend `pickBestVoice` scoring toward enhanced/neural voices and remove the male-only bias.
- Hadith: new `hadithStore.ts` (IndexedDB cache) plus `HadithScreen.tsx`, wired into `Index.tsx` and bottom navigation; a small edge function proxies and caches the hadith API responses.
- `MOBILE_APP_REPORT.md` holds the platform comparison and APK build steps.
