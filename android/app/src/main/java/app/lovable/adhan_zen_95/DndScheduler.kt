package app.lovable.adhan_zen_95

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.edit

/**
 * Schedules DND on/off alarms using Android AlarmManager
 */
object DndScheduler {
    private const val TAG = "DndScheduler"
    private const val PREFS_NAME = "dnd_scheduler_prefs"
    private const val REQUEST_CODE_DND_ON_BASE = 5000
    private const val REQUEST_CODE_DND_OFF_BASE = 6000
    
    const val DEFAULT_DND_BEFORE_IQAMAH = 5
    const val DEFAULT_DND_AFTER_IQAMAH = 15
    
    fun scheduleDndOn(context: Context, iqamahTimeMillis: Long, prayerName: String, prayerIndex: Int, minutesBefore: Int = DEFAULT_DND_BEFORE_IQAMAH) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val dndOnTime = iqamahTimeMillis - (minutesBefore * 60 * 1000L)
        
        Log.d(TAG, "=== SCHEDULING DND ON ===")
        Log.d(TAG, "Prayer: $prayerName (index: $prayerIndex)")
        Log.d(TAG, "Iqamah time: ${java.util.Date(iqamahTimeMillis)}")
        Log.d(TAG, "DND ON time ($minutesBefore mins before): ${java.util.Date(dndOnTime)}")
        Log.d(TAG, "Current time: ${java.util.Date(System.currentTimeMillis())}")
        
        // Check DND permission - still schedule even if not granted (DndReceiver will use AudioManager fallback)
        if (!DndManager.hasPermission(context)) {
            Log.w(TAG, "⚠️ DND permission not granted - will use AudioManager fallback when triggered")
        }
        
        if (dndOnTime <= System.currentTimeMillis()) {
            Log.w(TAG, "⚠️ DND ON time already passed - skipping")
            return
        }
        
        val intent = Intent(context, DndReceiver::class.java).apply {
            action = DndReceiver.ACTION_DND_ON
            putExtra(DndReceiver.EXTRA_PRAYER_NAME, prayerName)
            putExtra("prayer_index", prayerIndex)
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context, 
            REQUEST_CODE_DND_ON_BASE + prayerIndex, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        try {
            // Use setAlarmClock - this is the MOST RELIABLE alarm type
            // It will wake the device even in deep doze mode and show alarm icon in status bar
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val alarmInfo = AlarmManager.AlarmClockInfo(dndOnTime, pendingIntent)
                alarmManager.setAlarmClock(alarmInfo, pendingIntent)
                Log.d(TAG, "✅ Scheduled ALARM_CLOCK for DND ON at ${java.util.Date(dndOnTime)}")
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, dndOnTime, pendingIntent)
                Log.d(TAG, "✅ Scheduled EXACT alarm for DND ON")
            }
            
            // Store for recovery
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
                putLong("dnd_on_$prayerIndex", dndOnTime)
                putLong("iqamah_$prayerIndex", iqamahTimeMillis)
                putString("prayer_name_$prayerIndex", prayerName)
                putInt("minutes_before", minutesBefore)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to schedule DND ON", e)
        }
    }
    
    fun scheduleDndOff(context: Context, iqamahTimeMillis: Long, prayerName: String, prayerIndex: Int, minutesAfter: Int = DEFAULT_DND_AFTER_IQAMAH) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val dndOffTime = iqamahTimeMillis + (minutesAfter * 60 * 1000L)
        
        Log.d(TAG, "=== SCHEDULING DND OFF ===")
        Log.d(TAG, "Prayer: $prayerName (index: $prayerIndex)")
        Log.d(TAG, "Iqamah time: ${java.util.Date(iqamahTimeMillis)}")
        Log.d(TAG, "DND OFF time ($minutesAfter mins after): ${java.util.Date(dndOffTime)}")
        Log.d(TAG, "Current time: ${java.util.Date(System.currentTimeMillis())}")
        
        if (dndOffTime <= System.currentTimeMillis()) {
            Log.w(TAG, "⚠️ DND OFF time already passed - skipping")
            return
        }
        
        val intent = Intent(context, DndReceiver::class.java).apply {
            action = DndReceiver.ACTION_DND_OFF
            putExtra(DndReceiver.EXTRA_PRAYER_NAME, prayerName)
            putExtra("prayer_index", prayerIndex)
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context, 
            REQUEST_CODE_DND_OFF_BASE + prayerIndex, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        try {
            // Use setAlarmClock - this is the MOST RELIABLE alarm type
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val alarmInfo = AlarmManager.AlarmClockInfo(dndOffTime, pendingIntent)
                alarmManager.setAlarmClock(alarmInfo, pendingIntent)
                Log.d(TAG, "✅ Scheduled ALARM_CLOCK for DND OFF at ${java.util.Date(dndOffTime)}")
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, dndOffTime, pendingIntent)
                Log.d(TAG, "✅ Scheduled EXACT alarm for DND OFF")
            }
            
            // Store for recovery
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
                putLong("dnd_off_$prayerIndex", dndOffTime)
                putInt("minutes_after", minutesAfter)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to schedule DND OFF", e)
        }
    }
    
    fun scheduleDndForPrayer(context: Context, iqamahTimeMillis: Long, prayerName: String, prayerIndex: Int, minutesBefore: Int = DEFAULT_DND_BEFORE_IQAMAH, minutesAfter: Int = DEFAULT_DND_AFTER_IQAMAH) {
        scheduleDndOn(context, iqamahTimeMillis, prayerName, prayerIndex, minutesBefore)
        scheduleDndOff(context, iqamahTimeMillis, prayerName, prayerIndex, minutesAfter)
    }
    
    fun rescheduleStoredDndAlarms(context: Context) {
        Log.d(TAG, "🔄 Rescheduling stored DND alarms...")
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val minutesBefore = prefs.getInt("minutes_before", DEFAULT_DND_BEFORE_IQAMAH)
        val minutesAfter = prefs.getInt("minutes_after", DEFAULT_DND_AFTER_IQAMAH)
        var rescheduledCount = 0
        
        for (i in 0..4) {
            val iqamahTime = prefs.getLong("iqamah_$i", 0)
            val name = prefs.getString("prayer_name_$i", null)
            
            if (iqamahTime > now && name != null) {
                scheduleDndForPrayer(context, iqamahTime, name, i, minutesBefore, minutesAfter)
                rescheduledCount++
            }
        }
        
        Log.d(TAG, "📅 Rescheduled DND for $rescheduledCount prayers")
    }
    
    fun cancelAllDndAlarms(context: Context) {
        Log.d(TAG, "🚫 Cancelling all DND alarms...")
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for (i in 0..4) {
            listOf(DndReceiver.ACTION_DND_ON, DndReceiver.ACTION_DND_OFF).forEachIndexed { idx, action ->
                val intent = Intent(context, DndReceiver::class.java).apply { this.action = action }
                val code = if (idx == 0) REQUEST_CODE_DND_ON_BASE + i else REQUEST_CODE_DND_OFF_BASE + i
                PendingIntent.getBroadcast(context, code, intent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)?.let { 
                    alarmManager.cancel(it)
                    Log.d(TAG, "Cancelled DND alarm $i ($action)")
                }
            }
        }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit { clear() }
    }
}

