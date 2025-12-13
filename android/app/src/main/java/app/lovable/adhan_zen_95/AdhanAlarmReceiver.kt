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
        private const val DEBOUNCE_TIME_MS = 30000L // 30 seconds debounce (reduced from 2 minutes)
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        try {
            val prayerName = intent.getStringExtra(AdhanForegroundService.EXTRA_PRAYER_NAME) ?: "Prayer"
            val prayerIndex = intent.getIntExtra("prayer_index", -1)
            
            Log.d(TAG, "=== ADHAN ALARM RECEIVED ===")
            Log.d(TAG, "Prayer: $prayerName (index: $prayerIndex)")
            Log.d(TAG, "Time: ${java.util.Date()}")
            
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()
            
            // Get today's date string for daily tracking
            val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
            
            // CRITICAL: Clear old daily flags FIRST before any checks
            // This prevents stale flags from blocking alarms (especially Fajr)
            clearOldDailyFlags(prefs, today)
            
            // For Fajr specifically, log current flag state for debugging
            if (prayerName.contains("Fajr", ignoreCase = true)) {
                val allFlags = prefs.all.filterKeys { it.startsWith("triggered_") }
                Log.d(TAG, "🌅 FAJR ALARM - Current trigger flags: $allFlags")
            }
            
            val dailyTriggerKey = "triggered_${prayerName}_$today"
            
            // Check if already triggered today for this prayer
            if (prefs.getBoolean(dailyTriggerKey, false)) {
                // Double-check with time-based debounce to avoid false positives
                val lastTriggerKey = "last_trigger_$prayerName"
                val lastTrigger = prefs.getLong(lastTriggerKey, 0)
                
                // If last trigger was more than 30 seconds ago, allow re-trigger (might be legitimate)
                if (now - lastTrigger < DEBOUNCE_TIME_MS) {
                    Log.w(TAG, "⚠️ Already triggered $prayerName today within ${DEBOUNCE_TIME_MS}ms - skipping duplicate")
                    return
                } else {
                    Log.d(TAG, "ℹ️ Daily flag was set but last trigger was ${(now - lastTrigger) / 1000}s ago - allowing re-trigger")
                }
            }
            
            // Time-based debounce as primary check
            val lastTriggerKey = "last_trigger_$prayerName"
            val lastTrigger = prefs.getLong(lastTriggerKey, 0)
            
            if (now - lastTrigger < DEBOUNCE_TIME_MS) {
                Log.w(TAG, "⚠️ Debounce: Already triggered for $prayerName within ${DEBOUNCE_TIME_MS}ms - skipping")
                return
            }
            
            // Mark as triggered for today and update timestamp
            prefs.edit { 
                putBoolean(dailyTriggerKey, true)
                putLong(lastTriggerKey, now) 
            }
            
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
    
    private fun clearOldDailyFlags(prefs: android.content.SharedPreferences, today: String) {
        try {
            val keysToRemove = mutableListOf<String>()
            prefs.all.forEach { (key, _) ->
                if (key.startsWith("triggered_") && !key.endsWith(today)) {
                    keysToRemove.add(key)
                }
            }
            if (keysToRemove.isNotEmpty()) {
                prefs.edit {
                    keysToRemove.forEach { remove(it) }
                }
                Log.d(TAG, "🧹 Cleared ${keysToRemove.size} old daily trigger flags")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to clear old flags", e)
        }
    }
}
