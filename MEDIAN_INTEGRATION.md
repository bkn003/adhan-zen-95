# Median.co Integration Guide for Offline Adhan

This guide explains how to integrate the Adhan Zen app with Median.co AppMaker for native Android functionality with offline Adhan support.

## Overview

Median.co's AppMaker provides a no-code solution to convert web apps into native Android/iOS apps with full access to native features like:
- Background notifications and alarms
- Offline audio playback
- Boot receivers for rescheduling after device restart
- Foreground and background services

## Prerequisites

1. **Adhan Audio File**: The app uses `azan1.mp3` from IslamCan
   - URL: `https://www.islamcan.com/audio/adhan/azan1.mp3`
   - This file must be bundled with the app for offline playback

2. **Web App URL**: Your deployed Lovable app URL
   - Example: `https://86147f9e-50fb-489a-a685-0e1bedcaa3b4.lovable.app`

## Median.co Setup Steps

### Step 1: Create Median.co Account
1. Go to [Median.co](https://median.co)
2. Sign up for an account
3. Choose the AppMaker plan

### Step 2: Configure App Basics
1. **App Name**: Adhan Zen
2. **Package ID**: `app.lovable.adhan_zen_95`
3. **Web URL**: Your Lovable app URL
4. **Platform**: Android (or both Android & iOS)

### Step 3: Configure Permissions

In the Median.co dashboard, enable these Android permissions:

#### Required Permissions
```xml
<!-- Notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Exact Alarms (Android 12+) -->
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />

<!-- Boot Receiver -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<!-- Wake Lock (for alarms) -->
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Vibration -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Location (for Qibla compass) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Foreground Service -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

<!-- Internet & Network State -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Step 4: Add Native Modules

In Median.co dashboard, enable these modules:

1. **Local Notifications** - For scheduling Adhan alarms
2. **Background Audio** - For playing Adhan when app is closed
3. **Boot Receiver** - For rescheduling after device restart
4. **Location Services** - For Qibla direction

### Step 5: Bundle Adhan Audio

#### Option A: Using Median's Asset Bundling
1. Upload `azan1.mp3` to Median.co's asset manager
2. The file will be bundled with the app at build time
3. Reference it in code as: `median://assets/azan1.mp3`

#### Option B: Using Public URL with Offline Cache
1. Host `azan1.mp3` on your server or CDN
2. App will download and cache it in IndexedDB on first launch
3. Fallback to bundled resource if download fails

**Recommended**: Use Option A for guaranteed offline support

### Step 6: Configure JavaScript Bridge

Add this JavaScript code to communicate with Median's native bridge:

```javascript
// Add to your HomeScreen.tsx or App.tsx

// Function to schedule prayer times via Median
function scheduleAdhanWithMedian(prayers) {
  if (window.median && window.median.notifications) {
    const notifications = prayers.map((prayer, index) => ({
      id: `prayer_${prayer.type}_${Date.now()}`,
      title: `${prayer.name} Adhan`,
      body: "It's time for prayer",
      time: prayer.adhan, // HH:mm format
      sound: 'azan1', // References bundled audio
      recurring: false,
      vibrate: true,
      priority: 'high'
    }));

    window.median.notifications.scheduleMultiple(notifications);
    console.log('✅ Scheduled', notifications.length, 'prayers with Median');
  }
}

// Function to save prayer times for boot recovery
function savePrayerTimesForBoot(prayers) {
  const prayerData = {
    prayers: prayers.map(p => ({
      name: p.name,
      adhan: p.adhan,
      type: p.type
    })),
    date: new Date().toISOString()
  };
  
  localStorage.setItem('median_prayer_data', JSON.stringify(prayerData));
}

// Call these functions when prayer times are loaded
// Example usage in HomeScreen.tsx:
useEffect(() => {
  if (prayers && prayers.length > 0) {
    scheduleAdhanWithMedian(prayers);
    savePrayerTimesForBoot(prayers);
  }
}, [prayers]);
```

### Step 7: Boot Receiver Configuration

Median.co automatically handles boot receivers. Add this configuration:

**Boot Action**: `RESCHEDULE_PRAYERS`

**Boot Script**:
```javascript
// This runs when device boots
(function() {
  const stored = localStorage.getItem('median_prayer_data');
  if (stored) {
    const { prayers, date } = JSON.parse(stored);
    
    // Check if data is for today
    const storedDate = new Date(date);
    const today = new Date();
    const isSameDay = storedDate.toDateString() === today.toDateString();
    
    if (isSameDay && prayers) {
      scheduleAdhanWithMedian(prayers);
      console.log('🔄 Rescheduled prayers after boot');
    }
  }
})();
```

### Step 8: Foreground/Background Service

Enable in Median dashboard:

**Service Name**: `AdhanPlaybackService`  
**Service Type**: `MEDIA_PLAYBACK`  
**Persistent**: `true`

This ensures audio plays even when app is fully closed.

## Testing the Integration

### Test Scenario 1: Offline Mode
1. Open app with internet
2. Select a mosque location
3. Prayer times load and schedule
4. Enable airplane mode
5. Close the app completely
6. **Expected**: Adhan plays at scheduled time

### Test Scenario 2: Device Reboot
1. Schedule today's prayers
2. Reboot the device
3. **Expected**: Prayers automatically reschedule on boot
4. **Expected**: Adhan plays at next prayer time

### Test Scenario 3: App Closed
1. Schedule prayers
2. Force close app (swipe away from recent apps)
3. **Expected**: Adhan still plays at scheduled time

## Median.co Build Process

1. **Configure** all settings in dashboard
2. **Build** APK using Median's cloud builder
3. **Download** the APK file
4. **Test** on physical device or emulator

### Build Commands
- **Test Build**: Generates debug APK for testing
- **Production Build**: Generates release APK for Google Play

## Alternative: Direct APK Build (Without Median)

If you prefer full control, use the existing Capacitor setup:

```bash
# 1. Copy Adhan audio to Android resources
bash scripts/copy-adhan-to-android.sh

# 2. Build web assets
npm run build

# 3. Sync to Android
npx cap sync android

# 4. Build APK
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Comparison: Median vs Capacitor

| Feature | Median.co | Capacitor |
|---------|-----------|-----------|
| **Setup Complexity** | No-code dashboard | Requires Android Studio |
| **Build Process** | Cloud-based | Local build |
| **Customization** | Limited to dashboard | Full native code access |
| **Cost** | Subscription fee | Free (self-hosted) |
| **Boot Receiver** | Built-in | Manual setup |
| **Audio Bundling** | Asset manager | Manual res/raw copy |
| **Update Speed** | Instant (web updates) | Requires APK rebuild |

## Troubleshooting

### Adhan Not Playing Offline
- **Check**: Audio file is bundled in Median assets
- **Check**: Notification permissions granted
- **Solution**: Ensure asset path is correct: `median://assets/azan1.mp3`

### Notifications Not Showing
- **Check**: POST_NOTIFICATIONS permission granted
- **Check**: Android 12+ requires SCHEDULE_EXACT_ALARM permission
- **Solution**: Request permissions at runtime via Median API

### Boot Receiver Not Working
- **Check**: RECEIVE_BOOT_COMPLETED permission granted
- **Check**: Boot script enabled in Median dashboard
- **Solution**: Re-open app once to refresh schedule

## Support Resources

- **Median Documentation**: https://docs.median.co
- **Median Community**: https://community.median.co
- **IslamCan Adhan Audio**: https://www.islamcan.com/audio/adhan/

## Final Checklist

Before building your app with Median.co:

- [ ] All permissions configured in dashboard
- [ ] `azan1.mp3` uploaded to Median assets
- [ ] JavaScript bridge code added to app
- [ ] Boot receiver configured
- [ ] Foreground service enabled
- [ ] Test build downloaded and tested
- [ ] Offline mode tested successfully
- [ ] Boot recovery tested successfully

---

**Happy Building! 🕌 May your app help millions of Muslims with their prayers.**
