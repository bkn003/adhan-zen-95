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
    
    fun scheduleAdhanAlarm(context: Context, adhanTimeMillis: Long, prayerName: String, prayerIndex: Int, iqamahTimeMillis: Long = 0L, adhanTimeStr: String = "", iqamahTimeStr: String = "") {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        Log.d(TAG, "╔════════════════════════════════════════╗")
        Log.d(TAG, "║      SCHEDULING ADHAN ALARM            ║")
        Log.d(TAG, "╠════════════════════════════════════════╣")
        Log.d(TAG, "║ Prayer: $prayerName (index: $prayerIndex)")
        Log.d(TAG, "║ Adhan time: ${java.util.Date(adhanTimeMillis)}")
        Log.d(TAG, "║ Current time: ${java.util.Date(System.currentTimeMillis())}")
        
        val timeDiffMs = adhanTimeMillis - System.currentTimeMillis()
        val timeDiffMinutes = timeDiffMs / (1000 * 60)
        Log.d(TAG, "║ Time until alarm: ${timeDiffMinutes} minutes ($timeDiffMs ms)")
        
        // Check battery optimization status for diagnostic logging
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            val isIgnoring = powerManager.isIgnoringBatteryOptimizations(context.packageName)
            Log.d(TAG, "║ Battery optimization ignored: $isIgnoring")
        } catch (e: Exception) {
            Log.w(TAG, "║ Could not check battery optimization")
        }
        
        Log.d(TAG, "║ Manufacturer: ${android.os.Build.MANUFACTURER}")
        Log.d(TAG, "║ Model: ${android.os.Build.MODEL}")
        Log.d(TAG, "╚════════════════════════════════════════╝")
        
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
            // PRIMARY: Use setAlarmClock for maximum reliability - this wakes device even in Doze mode
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(adhanTimeMillis, pendingIntent), pendingIntent)
                Log.d(TAG, "✅ PRIMARY: Scheduled AlarmClock for $prayerName at ${java.util.Date(adhanTimeMillis)}")
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, adhanTimeMillis, pendingIntent)
                Log.d(TAG, "✅ Scheduled exact alarm for $prayerName")
            }
            
            // SIMPLIFIED: Only using setAlarmClock (like native Clock app)
            // setAlarmClock is the MOST reliable - wakes from Doze, shows in status bar
            // No backup alarm needed - this eliminates duplicate trigger issues
            
            // Store for recovery after reboot/app kill AND for new day rescheduling
            // Also store the time strings so we can recalculate for new days
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
                putLong("adhan_$prayerIndex", adhanTimeMillis)
                putString("prayer_name_$prayerIndex", prayerName)
                putLong("iqamah_$prayerIndex", iqamahTimeMillis)
                putLong("last_scheduled", System.currentTimeMillis())
                // Store time strings for new day rescheduling
                if (adhanTimeStr.isNotEmpty()) {
                    putString("adhan_time_str_$prayerIndex", adhanTimeStr)
                }
                if (iqamahTimeStr.isNotEmpty()) {
                    putString("iqamah_time_str_$prayerIndex", iqamahTimeStr)
                }
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
    
    /**
     * Reschedule alarms for a new day by recalculating timestamps from stored time strings.
     * This is called by AdhanDailyUpdateReceiver at midnight.
     */
    fun rescheduleForNewDay(context: Context) {
        Log.d(TAG, "🌅 Rescheduling alarms for NEW DAY...")
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var rescheduledCount = 0
        
        val today = java.util.Calendar.getInstance()
        val year = today.get(java.util.Calendar.YEAR)
        val month = today.get(java.util.Calendar.MONTH)
        val day = today.get(java.util.Calendar.DAY_OF_MONTH)
        
        for (i in 0..4) {
            val name = prefs.getString("prayer_name_$i", null) ?: continue
            val adhanTimeStr = prefs.getString("adhan_time_str_$i", null)
            val iqamahTimeStr = prefs.getString("iqamah_time_str_$i", null)
            
            if (adhanTimeStr != null) {
                // Recalculate the alarm time for today
                val newAdhanMillis = parseTimeToMillis(adhanTimeStr, year, month, day)
                val newIqamahMillis = if (iqamahTimeStr != null) parseTimeToMillis(iqamahTimeStr, year, month, day) else 0L
                
                if (newAdhanMillis > System.currentTimeMillis()) {
                    scheduleAdhanAlarm(context, newAdhanMillis, name, i, newIqamahMillis, adhanTimeStr, iqamahTimeStr ?: "")
                    rescheduledCount++
                    
                    // Also reschedule DND
                    if (newIqamahMillis > System.currentTimeMillis()) {
                        DndScheduler.scheduleDndForPrayer(context, newIqamahMillis, name, i)
                    }
                    
                    Log.d(TAG, "📿 Rescheduled $name for today at ${java.util.Date(newAdhanMillis)}")
                }
            } else {
                // Fallback: just shift yesterday's timestamp by 24 hours
                val oldTime = prefs.getLong("adhan_$i", 0)
                if (oldTime > 0) {
                    val newTime = oldTime + (24 * 60 * 60 * 1000L)
                    val now = System.currentTimeMillis()
                    
                    // Only schedule if the new time is in the future
                    if (newTime > now) {
                        val oldIqamahTime = prefs.getLong("iqamah_$i", 0)
                        val newIqamahTime = if (oldIqamahTime > 0) oldIqamahTime + (24 * 60 * 60 * 1000L) else 0L
                        
                        scheduleAdhanAlarm(context, newTime, name, i, newIqamahTime)
                        rescheduledCount++
                        
                        if (newIqamahTime > now) {
                            DndScheduler.scheduleDndForPrayer(context, newIqamahTime, name, i)
                        }
                        
                        Log.d(TAG, "📿 Rescheduled $name (fallback +24h) for ${java.util.Date(newTime)}")
                    }
                }
            }
        }
        
        Log.d(TAG, "🌅 Rescheduled $rescheduledCount alarms for new day")
    }
    
    private fun parseTimeToMillis(timeStr: String, year: Int, month: Int, day: Int): Long {
        val cal = java.util.Calendar.getInstance()
        cal.set(year, month, day, 0, 0, 0)
        cal.set(java.util.Calendar.MILLISECOND, 0)
        
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
            m = hm[1].toInt()
        }
        
        cal.set(java.util.Calendar.HOUR_OF_DAY, h)
        cal.set(java.util.Calendar.MINUTE, m)
        
        return cal.timeInMillis
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
    
    fun hasStoredPrayerData(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        for (i in 0..4) {
            if (prefs.getString("prayer_name_$i", null) != null) return true
        }
        return false
    }
}

