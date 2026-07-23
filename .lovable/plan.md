## Scope

Verify the existing Qaza/tracker screen covers your ask, then build the three genuinely missing features.

## 1. Prayer Tracker (verify existing)

The `QazaScreen` already ships qada counter, daily prayed checklist with history calendar, and per-prayer counts. I will:
- Add a **streak counter** (consecutive days with all 5 prayed) at the top of the Tracker tab.
- Ensure a **missed-prayer log** view (dates + which prayers missed) derived from existing history.
- Keep it tied to selected mosque via `currentLocationId` for per-mosque tracking.

No schema changes — data stays in `localStorage` (already the pattern).

## 2. Zakat Calculator (new)

New screen `src/screens/ZakatScreen.tsx` accessible from Settings → Tools.

Inputs:
- Cash, bank balance, gold (grams), silver (grams), business assets, liabilities
- Metal prices (gold/silver per gram) auto-fetched from a free API (metals.live / fallback manual)
- Configurable Nisab basis (gold 87.48g or silver 612.36g), 2.5% rate

Output:
- Line-by-line breakdown card
- Total zakatable wealth, Nisab threshold, whether liable, zakat due
- **Export** as printable PDF (via `window.print`) and copy-to-clipboard summary

No backend needed — pure client calc + fetch.

## 3. Home-Screen Widget / Quick Access (new)

True OS widgets need native modules. I will ship the PWA-equivalent that works today:
- New route `/widget` rendering a compact big-countdown next prayer view (dark, glanceable)
- Add manifest **shortcuts** for "Next Prayer", "Qibla", "Tracker" so long-pressing the installed app icon on Android jumps directly in
- Big "Add to Home Screen" hint in Settings explaining the shortcut

## 4. Smart Notifications with Weather (enhance)

Extend `usePrayerChangeNotifier` / prayer reminder path:
- Free `open-meteo.com` API (no key) using `currentLocation` lat/lng
- 15-min pre-prayer notification body includes: temp, condition, and a contextual tip
  - Rain → "Carry an umbrella"
  - >35°C → "Stay hydrated before Zuhr"
  - Cold + Fajr → "Wear warm clothes"
- Cached 30 min in `localStorage` to avoid rate limits
- New setting toggle in `SettingsScreen`: "Weather-aware reminders"

## Technical Notes

- Zakat metal price API: `https://api.metals.dev/v1/latest` free tier, fallback to user-editable input
- Weather API: `https://api.open-meteo.com/v1/forecast?...&current=temperature_2m,weather_code`
- Widget route excluded from bottom nav / auth
- All new strings routed through `getLocalizedText`

## Files Touched

- `src/screens/QazaScreen.tsx` (streak + missed log)
- `src/screens/ZakatScreen.tsx` (new)
- `src/screens/WidgetScreen.tsx` (new) + route in `App.tsx`
- `public/manifest.webmanifest` (shortcuts)
- `src/utils/weather.ts` (new)
- `src/hooks/usePrayerReminders.ts` (weather integration)
- `src/screens/SettingsScreen.tsx` (Zakat link + weather toggle + install hint)
