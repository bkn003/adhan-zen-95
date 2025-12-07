package app.lovable.adhan_zen_95

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.content.edit

class AdhanAlarmReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AdhanAlarmReceiver"
        private const val PREFS_NAME = "adhan_alarm_prefs"
        private const val DEBOUNCE_TIME_MS = 30000L // 30 seconds debounce
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        try {
            val prayerName = intent.getStringExtra(AdhanForegroundService.EXTRA_PRAYER_NAME) ?: "Prayer"
            val prayerIndex = intent.getIntExtra("prayer_index", -1)
            
            Log.d(TAG, "=== ADHAN ALARM RECEIVED ===")
            Log.d(TAG, "Prayer: $prayerName (index: $prayerIndex)")
            Log.d(TAG, "Time: ${java.util.Date()}")
            
            // Debounce check to prevent duplicate notifications
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val lastTriggerKey = "last_trigger_$prayerName"
            val lastTrigger = prefs.getLong(lastTriggerKey, 0)
            val now = System.currentTimeMillis()
            
            if (now - lastTrigger < DEBOUNCE_TIME_MS) {
                Log.w(TAG, "⚠️ Debounce: Already triggered for $prayerName within ${DEBOUNCE_TIME_MS}ms - skipping")
                return
            }
            
            // Update last trigger time
            prefs.edit { putLong(lastTriggerKey, now) }
            
            // Check if adhan is already playing
            if (AdhanForegroundService.isCurrentlyPlaying()) {
                Log.w(TAG, "⚠️ Adhan already playing - skipping")
                return
            }
            
            // Start the adhan service
            val serviceIntent = Intent(context, AdhanForegroundService::class.java).apply {
                action = AdhanForegroundService.ACTION_PLAY_ADHAN
                putExtra(AdhanForegroundService.EXTRA_PRAYER_NAME, prayerName)
            }
            
            ContextCompat.startForegroundService(context, serviceIntent)
            Log.d(TAG, "✅ Started AdhanForegroundService for $prayerName")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start adhan service", e)
        }
    }
}
