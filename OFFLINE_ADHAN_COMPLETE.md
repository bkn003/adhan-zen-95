# Complete Offline Adhan System for Android

This document explains the comprehensive offline Adhan (call to prayer) system for the native Android app.

## Architecture Overview

The app uses a multi-layered offline-first approach:

### 1. **Audio Storage** (IndexedDB + Android Resources)
- **Web/PWA**: Adhan MP3 cached in IndexedDB via `audioStore.ts`
- **Android Native**: MP3 bundled in `android/app/src/main/res/raw/azan1.mp3`
- Auto-download fallback if audio missing

### 2. **Prayer Time Storage** (IndexedDB)
- Prayer times saved to IndexedDB via `prayerStore.ts`
- Stores: location, date, all 5 prayers + times
- 7-day auto-cleanup to prevent bloat
- Offline fallback: displays cached times when network unavailable

### 3. **Notification Scheduling** (Capacitor Local Notifications)
- Uses `@capacitor/local-notifications` for exact-time alarms
- Schedules 5 daily prayers: Fajr, Dhuhr, Asr, Maghrib, Isha
- Plays custom Adhan sound from `res/raw/azan1.mp3`
- Works when app is **closed, offline, or in background**

### 4. **Boot Recovery** (Android Broadcast Receiver)
- `AthanBootReceiver.kt`: Listens for device boot
- Recreates notification channel with custom sound
- `AdhanRescheduler.kt`: Attempts to reschedule from stored data
- Ensures alarms survive device restart

---

## File Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/app/lovable/adhan_zen_95/
│   │   │   ├── MainActivity.kt              # Requests exact alarm permission
│   │   │   ├── AthanBootReceiver.kt         # Boot listener
│   │   │   └── AdhanRescheduler.kt          # Reschedules after boot
│   │   ├── res/
│   │   │   ├── raw/
│   │   │   │   └── azan1.mp3                # Bundled Adhan audio
│   │   │   └── values/
│   │   │       └── strings.xml
│   │   └── AndroidManifest.xml              # Permissions + boot receiver
│   └── build.gradle

src/
├── storage/
│   ├── audioStore.ts                        # Cache Adhan MP3 in IndexedDB
│   └── prayerStore.ts                       # Store prayer times offline
├── native/
│   ├── offlineAdhanService.ts               # Offline scheduling service
│   ├── useNativeAdhanScheduler.ts           # Schedule native notifications
│   └── foregroundAdhanPlayer.ts             # Play audio when app open
├── hooks/
│   └── useGeolocation.ts                    # Enhanced GPS + compass
└── screens/
    ├── HomeScreen.tsx                       # Main prayer times + scheduling
    └── QiblaScreen.tsx                      # Qibla direction with compass
```

---

## How It Works

### When User Opens App (Online)
1. Fetches prayer times from Supabase
2. Saves times to IndexedDB (`saveDailySchedule`)
3. Downloads/caches Adhan MP3 to IndexedDB
4. Schedules Android notifications for each prayer
5. Stores prayer data in localStorage for boot recovery

### When App is Closed/Background
- Android Local Notifications trigger at exact prayer times
- Plays `res/raw/azan1.mp3` via notification channel
- No network required (everything pre-scheduled)

### When Device Reboots
1. `AthanBootReceiver` fires on `BOOT_COMPLETED`
2. Recreates notification channel with custom sound
3. `AdhanRescheduler` reads stored prayer data
4. Reschedules pending notifications for today

### When User Opens App (Offline)
1. Checks IndexedDB for cached prayer times
2. Displays offline data if available
3. Loads cached Adhan audio from IndexedDB
4. Can still play Adhan in foreground

---

## Permissions Required

### Android Manifest Permissions
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

### Runtime Permissions
- **Notification Permission**: Requested via `LocalNotifications.requestPermissions()`
- **Exact Alarm Permission**: Requested via `MainActivity.kt` on Android 12+
- **Location Permission**: For Qibla compass (user prompt)

---

## Build Instructions

### 1. Copy Adhan Audio to Android
```bash
bash scripts/copy-adhan-to-android.sh
```
- Downloads `azan1.mp3` if missing
- Copies to `android/app/src/main/res/raw/azan1.mp3`

### 2. Build Web Assets
```bash
npm run build
```

### 3. Sync Capacitor
```bash
npx cap sync android
```

### 4. Build APK
**Debug Build:**
```bash
cd android && ./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

**Release Build:**
```bash
cd android && ./gradlew assembleRelease
```

---

## Testing Offline Adhan

### Test Scenario 1: App Closed
1. Open app, select location (prayer times load)
2. Wait for scheduling confirmation in logs
3. Force close app
4. Wait for next prayer time
5. ✅ Notification should appear with Adhan sound

### Test Scenario 2: Airplane Mode
1. Enable airplane mode (no network)
2. Open app
3. ✅ Should display cached prayer times from IndexedDB
4. ✅ Notifications still trigger at scheduled times

### Test Scenario 3: Device Reboot
1. Schedule today's prayers
2. Reboot device
3. Check logs for `AthanBootReceiver`
4. ✅ Notification channel recreated
5. ✅ Future prayers rescheduled

---

## Median.co Integration

### Using AppMaker
The app also integrates with Median.co's AppMaker via:
```javascript
window.saveTodayPrayerTimes({
  fajr: "04:55",
  dhuhr: "12:45",
  asr: "16:30",
  maghrib: "18:09",
  isha: "19:25"
})
```

Median's native bridge handles:
- Scheduling iOS/Android alarms
- Playing bundled Adhan audio
- Persistent notifications

This provides an **alternative** to Capacitor for users who prefer no-code deployment.

---

## Troubleshooting

### No Sound Plays
- **Check**: `azan1.mp3` exists in `android/app/src/main/res/raw/`
- **Run**: `bash scripts/copy-adhan-to-android.sh`
- **Verify**: Notification channel uses `sound: "azan1"`

### Notifications Don't Show
- **Check**: Notification permission granted
- **Android 12+**: Ensure exact alarm permission granted
- **Verify**: Check system notification settings for the app

### Adhan Doesn't Play After Reboot
- **Check**: Boot receiver registered in `AndroidManifest.xml`
- **Check**: `RECEIVE_BOOT_COMPLETED` permission granted
- **Solution**: Open app once daily to refresh schedule

### Offline Times Not Showing
- **Check**: Prayer times saved to IndexedDB (check browser DevTools)
- **Check**: `loadDailySchedule` called in `HomeScreen.tsx`
- **Verify**: At least one online session to cache data

---

## Next Steps

### Enhancements
- [ ] Multi-day scheduling (7 days ahead)
- [ ] Custom Adhan selection (user uploads)
- [ ] Pre-Adhan reminder notifications (5 min before)
- [ ] Vibration patterns for silent mode
- [ ] Widget support (Android home screen)

### Production Deployment
1. Generate signed release APK with keystore
2. Update `applicationId` in `build.gradle`
3. Upload to Google Play Console
4. Set up Play Store listing

---

## Technical Details

### Notification Channel Config
```kotlin
Channel(
  id: "adhan_channel",
  name: "Adhan",
  importance: IMPORTANCE_HIGH,     // Shows as heads-up
  sound: "azan1",                  // Plays res/raw/azan1.mp3
  vibration: true,
  lights: true,
  lockscreenVisibility: VISIBILITY_PUBLIC
)
```

### IndexedDB Schema
```typescript
// Prayer schedule
{
  locationId: string,
  date: string,
  prayers: Prayer[],
  timestamp: number,
  locationName?: string
}

// Cached audio
{
  'adhan_audio_blob_v2': Blob
}
```

### LocalStorage Keys
- `selectedLocationId`: User's chosen mosque
- `adhanVolume`: Playback volume (0-1)
- `native_prayer_data`: Boot recovery data

---

## Support

For issues or questions:
- Check console logs in browser DevTools
- Check Android Logcat: `adb logcat | grep Adhan`
- Review network requests in DevTools
- Test with `npx cap run android --livereload` for debugging

**Happy praying! 🕌**
