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
        private const val DEBOUNCE_TIME_MS = 120000L // 2 minutes debounce to prevent double triggers from backup alarms
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        acquireTempWakeLock(context)
        try {
            val prayerName = intent.getStringExtra(AdhanForegroundService.EXTRA_PRAYER_NAME) ?: "Prayer"
            val prayerIndex = intent.getIntExtra("prayer_index", -1)
            val isBackupAlarm = intent.getBooleanExtra("is_backup", false)
            
            Log.d(TAG, "╔════════════════════════════════════════╗")
            Log.d(TAG, "║      ADHAN ALARM RECEIVED              ║")
            Log.d(TAG, "╠════════════════════════════════════════╣")
            Log.d(TAG, "║ Prayer: $prayerName (index: $prayerIndex)")
            Log.d(TAG, "║ Is backup alarm: $isBackupAlarm")
            Log.d(TAG, "║ Time: ${java.util.Date()}")
            Log.d(TAG, "║ Manufacturer: ${android.os.Build.MANUFACTURER}")
            Log.d(TAG, "║ Model: ${android.os.Build.MODEL}")
            Log.d(TAG, "╚════════════════════════════════════════╝")
            
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
        } finally {
             // Release the lock if we created one (though for temporary locks we often rely on timeout, 
             // but explicit release is better if we tracked it. Here we just used a timeout acquisition strategy 
             // or we should store it. Since BroadcastReceiver is short-lived, a fire-and-forget wakelock with timeout is common pattern
             // BUT proper pattern is: 
             // val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
             // val wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AdhanZen:AlarmReceiver")
             // wl.acquire(10000)
        }
    }
    
    // We need to wrap the whole logic in WakeLock
    private fun acquireTempWakeLock(context: Context) {
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            val wl = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "AdhanZen:AlarmReceiver")
            wl.acquire(10000) // 10 seconds sufficient to start service
            Log.d(TAG, "⚡ Acquired temp WakeLock for AlarmReceiver")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire temp WakeLock", e)
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
