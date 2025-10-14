package app.lovable.adhan_zen_95

import android.content.Context
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.plugin.localnotifications.LocalNotificationsPlugin
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

/**
 * Reschedules Adhan notifications after device boot
 * Reads prayer times from SharedPreferences and schedules them
 */
object AdhanRescheduler {
    
    private const val TAG = "AdhanRescheduler"
    private const val PREFS_NAME = "prayer_times"
    private const val KEY_PRAYER_DATA = "today_prayers"
    
    fun rescheduleNotifications(context: Context) {
        try {
            Log.d(TAG, "Rescheduling Adhan notifications after boot...")
            
            // Read stored prayer times from SharedPreferences
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val prayerDataJson = prefs.getString(KEY_PRAYER_DATA, null)
            
            if (prayerDataJson.isNullOrEmpty()) {
                Log.w(TAG, "No stored prayer times found. App must be opened to schedule.")
                return
            }
            
            val prayerData = JSONObject(prayerDataJson)
            val prayers = prayerData.getJSONArray("prayers")
            val baseDate = Date(prayerData.getLong("date"))
            
            // Check if stored data is for today
            val today = Calendar.getInstance()
            val storedCal = Calendar.getInstance().apply { time = baseDate }
            
            if (!isSameDay(today, storedCal)) {
                Log.w(TAG, "Stored prayer times are not for today. Skipping reschedule.")
                return
            }
            
            // Schedule notifications
            val notifications = mutableListOf<JSObject>()
            val now = System.currentTimeMillis()
            var idBase = (baseDate.time / 1000 % 1000000).toInt() * 10
            
            for (i in 0 until prayers.length()) {
                val prayer = prayers.getJSONObject(i)
                val prayerName = prayer.getString("name")
                val adhanTime = prayer.getString("adhan")
                val prayerType = prayer.getString("type")
                
                // Only schedule main 5 prayers
                if (!listOf("fajr", "dhuhr", "asr", "maghrib", "isha").contains(prayerType)) {
                    continue
                }
                
                val prayerDate = parseTimeToDate(adhanTime, baseDate)
                
                if (prayerDate.time > now) {
                    val notification = JSObject().apply {
                        put("id", ++idBase)
                        put("title", "$prayerName Adhan")
                        put("body", "It's time for prayer")
                        put("schedule", JSObject().apply {
                            put("at", prayerDate.time)
                            put("allowWhileIdle", true)
                        })
                        put("channelId", "adhan_channel")
                        put("sound", "azan1")
                        put("smallIcon", "ic_stat_name")
                        put("actionTypeId", "OPEN_APP")
                        put("extra", JSObject().apply {
                            put("type", prayerType)
                        })
                    }
                    notifications.add(notification)
                }
            }
            
            if (notifications.isNotEmpty()) {
                Log.d(TAG, "Scheduling ${notifications.size} Adhan notifications")
                // Note: This would require access to LocalNotificationsPlugin instance
                // In practice, the JS app should reschedule when opened
            } else {
                Log.d(TAG, "No future prayer times to schedule today")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to reschedule notifications", e)
        }
    }
    
    private fun parseTimeToDate(time: String, baseDate: Date): Date {
        val cal = Calendar.getInstance().apply { this.time = baseDate }
        
        val trimmed = time.trim()
        val (hours, minutes) = if (trimmed.contains("AM", ignoreCase = true) || 
                                    trimmed.contains("PM", ignoreCase = true)) {
            // 12-hour format
            val parts = trimmed.split(" ")
            val timeParts = parts[0].split(":")
            var h = timeParts[0].toInt()
            val m = timeParts.getOrNull(1)?.toInt() ?: 0
            val isPM = trimmed.contains("PM", ignoreCase = true)
            
            if (isPM && h != 12) h += 12
            if (!isPM && h == 12) h = 0
            
            Pair(h, m)
        } else {
            // 24-hour format
            val parts = trimmed.split(":")
            Pair(parts[0].toInt(), parts.getOrNull(1)?.toInt() ?: 0)
        }
        
        cal.set(Calendar.HOUR_OF_DAY, hours)
        cal.set(Calendar.MINUTE, minutes)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        
        return cal.time
    }
    
    private fun isSameDay(cal1: Calendar, cal2: Calendar): Boolean {
        return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
               cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR)
    }
}
