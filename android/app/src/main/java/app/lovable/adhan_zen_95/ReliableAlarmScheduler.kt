package app.lovable.adhan_zen_95

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.edit

object ReliableAlarmScheduler {
    private const val TAG = "ReliableAlarmScheduler"
    private const val PREFS_NAME = "reliable_alarm_prefs"
    private const val REQUEST_CODE_BASE = 3000
    
    fun scheduleAdhanAlarm(context: Context, adhanTimeMillis: Long, prayerName: String, prayerIndex: Int, iqamahTimeMillis: Long = 0L) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        Log.d(TAG, "=== SCHEDULING ADHAN ALARM ===")
        Log.d(TAG, "Prayer: $prayerName (index: $prayerIndex)")
        Log.d(TAG, "Adhan time: ${java.util.Date(adhanTimeMillis)}")
        Log.d(TAG, "Current time: ${java.util.Date(System.currentTimeMillis())}")
        
        val timeDiffMs = adhanTimeMillis - System.currentTimeMillis()
        val timeDiffMinutes = timeDiffMs / (1000 * 60)
        Log.d(TAG, "Time until alarm: ${timeDiffMinutes} minutes ($timeDiffMs ms)")
        
        // Fajr-specific logging
        if (prayerName.contains("Fajr", ignoreCase = true)) {
            Log.d(TAG, "🌅 FAJR ALARM SCHEDULING - This is an early morning prayer")
        }
        
        if (adhanTimeMillis <= System.currentTimeMillis()) {
            Log.w(TAG, "⚠️ Adhan time already passed - skipping")
            return
        }
        
        val intent = Intent(context, AdhanAlarmReceiver::class.java).apply {
            action = "app.lovable.adhan_zen_95.ADHAN_ALARM"
            putExtra(AdhanForegroundService.EXTRA_PRAYER_NAME, prayerName)
        }
        
        val pendingIntent = PendingIntent.getBroadcast(context, REQUEST_CODE_BASE + prayerIndex, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        
        try {
            // Use setAlarmClock for maximum reliability - this wakes device even in Doze mode
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(adhanTimeMillis, pendingIntent), pendingIntent)
                Log.d(TAG, "✅ Scheduled AlarmClock for $prayerName at ${java.util.Date(adhanTimeMillis)}")
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, adhanTimeMillis, pendingIntent)
                Log.d(TAG, "✅ Scheduled exact alarm for $prayerName")
            }
            
            // Store for recovery after reboot/app kill
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
                putLong("adhan_$prayerIndex", adhanTimeMillis)
                putString("prayer_name_$prayerIndex", prayerName)
                putLong("iqamah_$prayerIndex", iqamahTimeMillis)
                putLong("last_scheduled", System.currentTimeMillis())
            }
            
            Log.d(TAG, "💾 Stored alarm info in SharedPreferences for $prayerName")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to schedule alarm", e)
        }
    }
    
    fun rescheduleStoredAlarms(context: Context) {
        Log.d(TAG, "🔄 Rescheduling stored alarms...")
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        var rescheduledCount = 0
        
        for (i in 0..4) {
            val time = prefs.getLong("adhan_$i", 0)
            val name = prefs.getString("prayer_name_$i", null)
            val iqamahTime = prefs.getLong("iqamah_$i", 0)
            
            if (time > now && name != null) {
                scheduleAdhanAlarm(context, time, name, i, iqamahTime)
                rescheduledCount++
                
                // Also reschedule DND if we have iqamah time
                if (iqamahTime > now) {
                    DndScheduler.scheduleDndForPrayer(context, iqamahTime, name, i)
                }
            }
        }
        
        Log.d(TAG, "📅 Rescheduled $rescheduledCount alarms")
    }
    
    fun cancelAllAlarms(context: Context) {
        Log.d(TAG, "🚫 Cancelling all alarms...")
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for (i in 0..4) {
            val intent = Intent(context, AdhanAlarmReceiver::class.java)
            PendingIntent.getBroadcast(context, REQUEST_CODE_BASE + i, intent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)?.let { 
                alarmManager.cancel(it)
                Log.d(TAG, "Cancelled alarm $i")
            }
        }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit { clear() }
    }
    
    fun hasStoredAlarms(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        for (i in 0..4) {
            val time = prefs.getLong("adhan_$i", 0)
            if (time > now) return true
        }
        return false
    }
}

