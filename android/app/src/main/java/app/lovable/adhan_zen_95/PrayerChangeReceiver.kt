package app.lovable.adhan_zen_95

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar

/**
 * BroadcastReceiver that triggers before Isha to check for prayer time changes.
 * Shows a notification if tomorrow's prayer times are different from today's.
 */
class PrayerChangeReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "PrayerChangeReceiver"
        private const val REQUEST_CODE = 7777
        private const val MINUTES_BEFORE_ISHA = 30
        
        /**
         * Schedule the prayer change check to run before Isha time.
         * @param ishaTimeMillis The time of Isha prayer in milliseconds
         */
        fun scheduleBeforeIsha(context: Context, ishaTimeMillis: Long) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            // Schedule 30 minutes before Isha
            val triggerTime = ishaTimeMillis - (MINUTES_BEFORE_ISHA * 60 * 1000L)
            
            // Skip if time already passed
            if (triggerTime <= System.currentTimeMillis()) {
                Log.d(TAG, "⏭️ Prayer change check time already passed for today")
                return
            }
            
            val intent = Intent(context, PrayerChangeReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context, REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    val alarmInfo = AlarmManager.AlarmClockInfo(triggerTime, pendingIntent)
                    alarmManager.setAlarmClock(alarmInfo, pendingIntent)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                }
                
                Log.d(TAG, "✅ Scheduled prayer change check for ${java.util.Date(triggerTime)}")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to schedule prayer change check", e)
            }
        }
        
        /**
         * Schedule using stored Isha time from SharedPreferences.
         */
        fun scheduleFromStoredData(context: Context) {
            try {
                val prefs = context.getSharedPreferences("reliable_alarm_prefs", Context.MODE_PRIVATE)
                
                // Prayer index 4 = Isha
                val ishaTimeStr = prefs.getString("adhan_time_str_4", null)
                
                if (ishaTimeStr != null) {
                    val today = Calendar.getInstance()
                    val year = today.get(Calendar.YEAR)
                    val month = today.get(Calendar.MONTH)
                    val day = today.get(Calendar.DAY_OF_MONTH)
                    
                    val ishaMillis = parseTimeToMillis(ishaTimeStr, year, month, day)
                    
                    if (ishaMillis > System.currentTimeMillis()) {
                        scheduleBeforeIsha(context, ishaMillis)
                    }
                } else {
                    // Fallback: schedule for a default Isha time (e.g., 8:00 PM)
                    val today = Calendar.getInstance().apply {
                        set(Calendar.HOUR_OF_DAY, 20)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                    }
                    
                    if (today.timeInMillis > System.currentTimeMillis()) {
                        scheduleBeforeIsha(context, today.timeInMillis)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule from stored data", e)
            }
        }
        
        private fun parseTimeToMillis(timeStr: String, year: Int, month: Int, day: Int): Long {
            val cal = Calendar.getInstance()
            cal.set(year, month, day, 0, 0, 0)
            cal.set(Calendar.MILLISECOND, 0)
            
            val t = timeStr.trim()
            var h: Int
            var m: Int
            
            if (t.contains("AM", true) || t.contains("PM", true)) {
                val pts = t.split(" ")
                val hm = pts[0].split(":")
                h = hm[0].toInt()
                m = hm[1].toInt()
                if (pts[1].equals("PM", true) && h != 12) h += 12
                else if (pts[1].equals("AM", true) && h == 12) h = 0
            } else {
                val hm = t.split(":")
                h = hm[0].toInt()
                m = hm.getOrElse(1) { "0" }.toInt()
            }
            
            cal.set(Calendar.HOUR_OF_DAY, h)
            cal.set(Calendar.MINUTE, m)
            
            return cal.timeInMillis
        }
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "╔════════════════════════════════════════╗")
        Log.d(TAG, "║   PRAYER CHANGE CHECK TRIGGERED        ║")
        Log.d(TAG, "╠════════════════════════════════════════╣")
        Log.d(TAG, "║ Time: ${java.util.Date()}")
        Log.d(TAG, "╚════════════════════════════════════════╝")
        
        // Run in background thread since we may make network calls
        Thread {
            try {
                PrayerChangeNotifier.checkAndNotifyChanges(context)
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error in prayer change check", e)
            }
        }.start()
    }
}
