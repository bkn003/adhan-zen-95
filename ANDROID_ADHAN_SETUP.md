# Android Adhan Setup (Offline + App Closed)

This app schedules exact local notifications with a custom Adhan sound that plays even when the app is closed or offline. Follow these steps after adding Android with Capacitor.

## 1) Add Android platform and sync
```
npm i
npx cap add android
npm run build
npx cap sync android
```

## 2) Copy the Adhan sound into res/raw
Capacitor Local Notifications requires the sound to be a bundled Android resource.

```
bash scripts/copy-adhan-to-android.sh
```
This places `public/adhan-native.mp3` as `android/app/src/main/res/raw/azan1.mp3`.

Note: The notification channel is configured to use `sound: "azan1"`.

## 3) Update AndroidManifest permissions
Open `android/app/src/main/AndroidManifest.xml` and add:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

## 4) Ensure channel and exact alarms
The code creates a channel with importance=5 and `sound=azan1`. On Android 12+, users may need to allow exact alarms in system settings.

## 5) Reschedule after reboot (recommended)
Android clears scheduled alarms on reboot. Add a Boot Receiver to reschedule pending Adhan notifications after device restart.

Add this receiver inside `<application>` in `AndroidManifest.xml`:

```xml
<receiver
  android:name="com.example.app.AthanBootReceiver"
  android:enabled="true"
  android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.BOOT_COMPLETED" />
    <action android:name="android.intent.action.LOCKED_BOOT_COMPLETED" />
  </intent-filter>
</receiver>
```

Create `AthanBootReceiver.kt` under `android/app/src/main/java/<your/package>/`:

```kotlin
package YOUR_APP_PACKAGE

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.getcapacitor.community.localnotifications.LocalNotifications

class AthanBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Recreate the notification channel to ensure custom sound is set
    LocalNotifications.createChannel(context, mapOf(
      "id" to "adhan_channel",
      "name" to "Adhan",
      "description" to "Prayer time Adhan alerts",
      "importance" to 5,
      "visibility" to 1,
      "sound" to "azan1"
    ))
    // Optionally, reschedule next-day notifications here using native storage
    // If the app is opened daily, JS already schedules for that day.
  }
}
```

If you prefer not to write native code, simply open the app once per day so the JS scheduler re-schedules that day's notifications.

## 6) Build and run
```
npx cap run android
# or build a release APK
```

That’s it. With the sound in `res/raw` and the permissions above, Adhan audio will play offline and when the app is closed.
