package app.lovable.adhan_zen_95

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import androidx.core.content.ContextCompat

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Register the native plugin before calling super.onCreate()
        registerPlugin(AdhanNativePlugin::class.java)
        
        super.onCreate(savedInstanceState)
        
        // Initialize Adhan system on first launch
        AdhanInitializer.initializeIfNeeded(this)
        
        // Schedule daily updates
        AdhanDailyUpdateReceiver.scheduleDailyUpdate(this)
        
        // Request exact alarm permission on Android 12+
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            val alarmManager = getSystemService(android.app.AlarmManager::class.java)
            if (!alarmManager.canScheduleExactAlarms()) {
                val intent = Intent(
                    android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
                )
                startActivity(intent)
            }
        }
        
        // Check and prompt for DND permission if not granted
        if (!DndManager.hasPermission(this)) {
            android.util.Log.d("MainActivity", "DND permission not granted - will prompt when user enables DND feature")
        }
        
        // Start the prayer countdown notification service
        startPrayerCountdownService()
    }
    
    private fun startPrayerCountdownService() {
        try {
            val serviceIntent = Intent(this, PrayerCountdownService::class.java).apply {
                action = PrayerCountdownService.ACTION_START
            }
            ContextCompat.startForegroundService(this, serviceIntent)
            android.util.Log.d("MainActivity", "Started PrayerCountdownService")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Failed to start PrayerCountdownService", e)
        }
    }
}
