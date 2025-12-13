package app.lovable.adhan_zen_95

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import java.util.Calendar

/**
 * BroadcastReceiver that triggers at 12:05 AM daily to reschedule all alarms for the new day.
 * This is CRITICAL for ensuring Adhan alarms and DND work on consecutive days.
 */
class AdhanDailyUpdateReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AdhanDailyUpdate"
        private const val REQUEST_CODE = 9999
        
        fun scheduleDailyUpdate(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AdhanDailyUpdateReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            
            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 5)
                set(Calendar.SECOND, 0)
                if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
            }
            
            alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, calendar.timeInMillis, AlarmManager.INTERVAL_DAY, pendingIntent)
            Log.d(TAG, "📅 Scheduled daily update at ${calendar.time}")
        }
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "╔════════════════════════════════════════╗")
        Log.d(TAG, "║    DAILY UPDATE RECEIVER TRIGGERED     ║")
        Log.d(TAG, "╠════════════════════════════════════════╣")
        Log.d(TAG, "║ Time: ${java.util.Date()}")
        Log.d(TAG, "╚════════════════════════════════════════╝")
        
        // CRITICAL: Clear ALL stale trigger flags FIRST to ensure Fajr alarm works
        // This fixes the bug where Fajr worked yesterday but not today
        clearAllStaleTriggerFlags(context)
        
        // Run in background thread since we're making network calls
        Thread {
            try {
                // CRITICAL: Fetch new prayer times from Supabase for TODAY
                // This handles the case where prayer times change daily
                Log.d(TAG, "🌐 Fetching updated prayer times from Supabase...")
                PrayerTimeFetcher.fetchAndUpdatePrayerTimes(context)
                
                // Also start/restart the countdown notification service
                Log.d(TAG, "📊 Starting countdown service...")
                try {
                    val serviceIntent = Intent(context, PrayerCountdownService::class.java).apply {
                        action = PrayerCountdownService.ACTION_START
                    }
                    ContextCompat.startForegroundService(context, serviceIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start countdown service", e)
                }
                
                // Pre-cache upcoming prayer data for offline change notifications
                Log.d(TAG, "📦 Pre-caching upcoming prayer data...")
                PrayerChangeNotifier.preCacheUpcomingData(context)
                
                Log.d(TAG, "✅ Daily update complete")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Daily update failed", e)
                
                // Fallback to stored times if network fails
                try {
                    ReliableAlarmScheduler.rescheduleForNewDay(context)
                    DndScheduler.rescheduleForNewDay(context)
                } catch (e2: Exception) {
                    Log.e(TAG, "❌ Fallback also failed", e2)
                }
            }
        }.start()
    }
    
    /**
     * Clear all stale trigger flags from previous days.
     * This is CRITICAL for Fajr alarm to work - if flags from yesterday aren't cleared,
     * the AdhanAlarmReceiver will skip the alarm thinking it already triggered today.
     */
    private fun clearAllStaleTriggerFlags(context: Context) {
        try {
            val prefs = context.getSharedPreferences("adhan_alarm_prefs", Context.MODE_PRIVATE)
            val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
            
            val keysToRemove = mutableListOf<String>()
            prefs.all.forEach { (key, _) ->
                // Clear all trigger flags that are NOT from today
                if (key.startsWith("triggered_") && !key.endsWith(today)) {
                    keysToRemove.add(key)
                }
                // Also clear old last_trigger timestamps (older than 24 hours)
                if (key.startsWith("last_trigger_")) {
                    val timestamp = prefs.getLong(key, 0)
                    if (System.currentTimeMillis() - timestamp > 24 * 60 * 60 * 1000) {
                        keysToRemove.add(key)
                    }
                }
            }
            
            if (keysToRemove.isNotEmpty()) {
                prefs.edit().apply {
                    keysToRemove.forEach { remove(it) }
                    apply()
                }
                Log.d(TAG, "🧹 Cleared ${keysToRemove.size} stale trigger flags at midnight")
            } else {
                Log.d(TAG, "ℹ️ No stale flags to clear")
            }
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Failed to clear stale flags", e)
        }
    }
}

