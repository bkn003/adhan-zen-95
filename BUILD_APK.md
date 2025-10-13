# Building Android APK - Complete Guide

This guide provides step-by-step instructions to build a production-ready Android APK with offline Adhan functionality.

## Prerequisites

1. **GitHub Codespaces** or local development environment
2. **Android SDK** installed (automatically included in GitHub Codespaces with Android Studio)
3. **Java JDK 17** (included in Codespaces)

## Build Steps

### 1. Copy Adhan Audio to Android Resources

The Adhan audio must be copied to Android's raw resources folder:

```bash
bash scripts/copy-adhan-to-android.sh
```

This copies `public/adhan-native.mp3` to `android/app/src/main/res/raw/azan1.mp3`.

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Web Assets

```bash
npm run build
```

This creates the production build in the `dist/` folder.

### 4. Sync Capacitor

```bash
npx cap sync android
```

This copies the web build to Android and updates native dependencies.

### 5. Build the APK

#### Option A: Debug APK (Fastest)

```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Option B: Release APK (Production)

For a production release, you need to sign the APK. First, create a keystore:

```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Then build the release APK:

```bash
cd android
./gradlew assembleRelease
```

Sign and align the APK using `jarsigner` and `zipalign`.

### 6. Download the APK

From GitHub Codespaces:
1. Right-click on the APK file in the file explorer
2. Select "Download"
3. Install on your Android device

## Features Included

✅ **Offline Adhan Audio** - Audio plays even without internet  
✅ **Local Notifications** - Scheduled for all 5 daily prayers  
✅ **Background Notifications** - Works when app is closed  
✅ **Boot Receiver** - Reschedules notifications after device restart  
✅ **IndexedDB Storage** - Prayer times cached for offline use  
✅ **Foreground Audio** - Plays cached audio when app is open  

## Permissions Included

- `POST_NOTIFICATIONS` - For prayer time alerts
- `SCHEDULE_EXACT_ALARM` - For precise timing
- `RECEIVE_BOOT_COMPLETED` - To reschedule after reboot
- `WAKE_LOCK` - To wake device for notifications
- `VIBRATE` - For notification vibration
- `ACCESS_FINE_LOCATION` - For location-based features

## File Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml          # Permissions and receivers
│   │   ├── java/.../
│   │   │   ├── MainActivity.kt          # Main activity
│   │   │   └── AthanBootReceiver.kt     # Boot receiver
│   │   └── res/
│   │       ├── raw/
│   │       │   └── azan1.mp3           # Adhan audio file
│   │       └── values/
│   │           └── strings.xml
│   └── build.gradle
└── build.gradle
```

## Testing

After installing the APK on your device:

1. **Open the app** - Select a location and verify prayer times load
2. **Grant permissions** - Allow notifications and exact alarms
3. **Wait for prayer time** - The notification should appear with audio
4. **Test offline** - Enable airplane mode and verify app works
5. **Reboot test** - Restart device and check if notifications reschedule

## Troubleshooting

### No Adhan Sound
- Verify `azan1.mp3` exists in `android/app/src/main/res/raw/`
- Run `bash scripts/copy-adhan-to-android.sh` again
- Rebuild with `npx cap sync android`

### Notifications Not Showing
- Check notification permissions in device settings
- Ensure "Exact alarm" permission is granted (Android 12+)
- Check battery optimization settings

### App Shows Lovable Icon
- The capacitor config has the server URL commented out for production
- Make sure you built after removing the server URL

### Build Errors
- Clean build: `cd android && ./gradlew clean`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Sync again: `npx cap sync android`

## Development vs Production

### Development (with live reload)
Uncomment the `server` section in `capacitor.config.ts` to enable hot-reload from Lovable.

### Production (standalone APK)
Keep the `server` section commented out (default) to build a fully offline-capable app.

## Median.co Integration

This app is also compatible with Median.co's AppMaker. The prayer times integration works via:

```javascript
if (typeof window !== 'undefined' && window.saveTodayPrayerTimes) {
  window.saveTodayPrayerTimes(todayPrayerTimes);
}
```

This sends prayer times to Median.co's native bridge for scheduling.

## Next Steps

1. **Customize the app icon** - Replace files in `android/app/src/main/res/mipmap-*/`
2. **Update app name** - Edit `android/app/src/main/res/values/strings.xml`
3. **Change package ID** - Update `appId` in `capacitor.config.ts` and sync
4. **Add signing** - Configure release signing in `android/app/build.gradle`
5. **Publish to Play Store** - Create a Google Play Console account

## Support

For issues or questions, check:
- Console logs: `npx cap run android` to see device logs
- Build logs: Check Gradle output for errors
- Capacitor docs: https://capacitorjs.com/docs/android
