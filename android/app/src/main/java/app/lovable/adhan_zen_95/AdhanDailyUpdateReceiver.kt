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
}

