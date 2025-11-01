package app.lovable.adhan_zen_95

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Receives daily alarm to update prayer times in background
 */
class AdhanDailyUpdateReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("AdhanDailyUpdate", "Daily update triggered")
        
        // Use goAsync to prevent receiver from being killed during async operation
        val pendingResult = goAsync()
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Fetch and update prayer times
                val success = PrayerTimeFetcher.fetchAndUpdatePrayerTimes(context)
                
                if (success) {
                    Log.d("AdhanDailyUpdate", "Prayer times updated and rescheduled")
                } else {
                    Log.w("AdhanDailyUpdate", "Failed to update prayer times")
                }
                
                // Reschedule next daily update
                scheduleDailyUpdate(context)
                
            } finally {
                pendingResult.finish()
            }
        }
    }
    
    companion object {
        private const val DAILY_UPDATE_REQUEST_CODE = 999999
        
        fun scheduleDailyUpdate(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
                
                // Schedule for next midnight (00:05 AM to avoid midnight issues)
                val calendar = java.util.Calendar.getInstance().apply {
                    timeInMillis = System.currentTimeMillis()
                    set(java.util.Calendar.HOUR_OF_DAY, 0)
                    set(java.util.Calendar.MINUTE, 5)
                    set(java.util.Calendar.SECOND, 0)
                    
                    // If already past 00:05, schedule for tomorrow
                    if (timeInMillis <= System.currentTimeMillis()) {
                        add(java.util.Calendar.DAY_OF_YEAR, 1)
                    }
                }
                
                val intent = Intent(context, AdhanDailyUpdateReceiver::class.java)
                val pendingIntent = android.app.PendingIntent.getBroadcast(
                    context,
                    DAILY_UPDATE_REQUEST_CODE,
                    intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                )
                
                alarmManager.setExactAndAllowWhileIdle(
                    android.app.AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
                
                Log.d("AdhanDailyUpdate", "Scheduled next update at ${calendar.time}")
                
            } catch (e: Exception) {
                Log.e("AdhanDailyUpdate", "Failed to schedule daily update", e)
            }
        }
    }
}
