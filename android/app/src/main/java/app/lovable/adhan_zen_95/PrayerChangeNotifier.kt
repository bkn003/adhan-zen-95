package app.lovable.adhan_zen_95

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.edit
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar

/**
 * Handles checking for prayer time changes and notifying users.
 * Compares today's and tomorrow's prayer times and shows a notification if any changed.
 */
object PrayerChangeNotifier {
    private const val TAG = "PrayerChangeNotifier"
    private const val PREFS_NAME = "prayer_change_prefs"
    private const val CHANNEL_ID = "prayer_change_channel"
    private const val NOTIFICATION_ID = 8888
    
    private const val SUPABASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxodWZxbm9rbWRxa3Z6Y3hxd2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTIwMzksImV4cCI6MjA3MzIyODAzOX0.FHokW4gosyE7KuGowCtaGPBO-v7hxlh63lM6kRofwu4"
    
    data class PrayerTime(val name: String, val adhan: String, val iqamah: String)
    data class PrayerChange(val name: String, val oldTime: String, val newTime: String)
    
    /**
     * Check for prayer time changes and show notification if any.
     * Called before Isha time each day.
     */
    fun checkAndNotifyChanges(context: Context) {
        Log.d(TAG, "╔════════════════════════════════════════╗")
        Log.d(TAG, "║   CHECKING PRAYER TIME CHANGES          ║")
        Log.d(TAG, "╚════════════════════════════════════════╝")
        
        try {
            val prefs = context.getSharedPreferences("prayer_times_native", Context.MODE_PRIVATE)
            val locationId = prefs.getString("selected_location_id", null)
            
            if (locationId == null) {
                Log.w(TAG, "⚠️ No location selected - skipping change check")
                return
            }
            
            val today = Calendar.getInstance()
            val tomorrow = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) }
            
            // Get today's and tomorrow's prayer times
            val todayTimes = getPrayerTimesForDate(context, locationId, today)
            val tomorrowTimes = getPrayerTimesForDate(context, locationId, tomorrow)
            
            if (todayTimes == null || tomorrowTimes == null) {
                Log.w(TAG, "⚠️ Could not get prayer times for comparison")
                return
            }
            
            // Compare and find changes
            val changes = findChanges(todayTimes, tomorrowTimes)
            
            if (changes.isNotEmpty()) {
                Log.d(TAG, "📢 Found ${changes.size} prayer time changes!")
                showChangeNotification(context, changes)
                
                // CRITICAL: Pre-schedule tomorrow's alarms with the new times
                // This ensures alarms work correctly even without opening the app
                scheduleTomorrowAlarms(context, tomorrowTimes, tomorrow)
            } else {
                Log.d(TAG, "✅ No prayer time changes for tomorrow")
            }
            
            // Always pre-schedule tomorrow's alarms to ensure they're set
            // Even if times haven't changed, this ensures reliability
            if (tomorrowTimes != null) {
                scheduleTomorrowAlarms(context, tomorrowTimes, tomorrow)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error checking prayer time changes", e)
        }
    }
    
    /**
     * Pre-schedule tomorrow's alarms with the correct times.
     * This ensures alarms work correctly without needing to open the app.
     */
    private fun scheduleTomorrowAlarms(context: Context, prayers: List<PrayerTime>, tomorrow: Calendar) {
        Log.d(TAG, "📅 Pre-scheduling tomorrow's alarms...")
        
        val year = tomorrow.get(Calendar.YEAR)
        val month = tomorrow.get(Calendar.MONTH)
        val day = tomorrow.get(Calendar.DAY_OF_MONTH)
        val isFriday = tomorrow.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY
        
        prayers.forEachIndexed { index, prayer ->
            try {
                val adhanMillis = parseTimeStringToMillis(prayer.adhan, year, month, day)
                val iqamahMillis = parseTimeStringToMillis(prayer.iqamah, year, month, day)
                
                // Use Jummah name for Dhuhr on Friday
                val prayerName = if (index == 1 && isFriday) "Jummah" else prayer.name
                
                if (adhanMillis > System.currentTimeMillis()) {
                    // Schedule Adhan alarm
                    ReliableAlarmScheduler.scheduleAdhanAlarm(
                        context, adhanMillis, prayerName, index, 
                        iqamahMillis, prayer.adhan, prayer.iqamah
                    )
                    
                    // Schedule DND
                    if (iqamahMillis > System.currentTimeMillis()) {
                        DndScheduler.scheduleDndForPrayer(context, iqamahMillis, prayerName, index)
                    }
                    
                    Log.d(TAG, "📿 Pre-scheduled $prayerName for tomorrow at ${java.util.Date(adhanMillis)}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to schedule ${prayer.name}", e)
            }
        }
        
        Log.d(TAG, "✅ Pre-scheduled ${prayers.size} prayers for tomorrow")
    }
    
    private fun parseTimeStringToMillis(timeStr: String, year: Int, month: Int, day: Int): Long {
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
    
    
    private fun getPrayerTimesForDate(context: Context, locationId: String, date: Calendar): List<PrayerTime>? {
        val day = date.get(Calendar.DAY_OF_MONTH)
        val month = getMonthName(date.get(Calendar.MONTH))
        
        // Try cached data first
        val cachedData = getCachedPrayerData(context, locationId, month)
        if (cachedData != null) {
            val record = findMatchingDateRange(cachedData, day)
            if (record != null) {
                return extractPrayerTimes(record)
            }
        }
        
        // Try fetching from network
        val fetchedData = fetchFromSupabase(locationId, month)
        if (fetchedData != null) {
            // Cache for future use
            cachePrayerData(context, locationId, month, fetchedData)
            
            val record = findMatchingDateRange(fetchedData, day)
            if (record != null) {
                return extractPrayerTimes(record)
            }
        }
        
        return null
    }
    
    private fun getCachedPrayerData(context: Context, locationId: String, month: String): JSONArray? {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val key = "cached_${locationId}_$month"
            val cached = prefs.getString(key, null) ?: return null
            return JSONArray(cached)
        } catch (e: Exception) {
            return null
        }
    }
    
    private fun cachePrayerData(context: Context, locationId: String, month: String, data: JSONArray) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val key = "cached_${locationId}_$month"
            prefs.edit {
                putString(key, data.toString())
                putLong("${key}_timestamp", System.currentTimeMillis())
            }
            Log.d(TAG, "💾 Cached prayer data for $month")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cache prayer data", e)
        }
    }
    
    private fun fetchFromSupabase(locationId: String, month: String): JSONArray? {
        try {
            val urlString = "$SUPABASE_URL/rest/v1/prayer_times?location_id=eq.$locationId&month=eq.$month&select=*"
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "GET"
                setRequestProperty("apikey", SUPABASE_ANON_KEY)
                setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 10000
                readTimeout = 10000
            }
            
            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()
                return JSONArray(response)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Network error fetching prayer data", e)
        }
        return null
    }
    
    private fun findMatchingDateRange(data: JSONArray, day: Int): JSONObject? {
        for (i in 0 until data.length()) {
            val record = data.getJSONObject(i)
            val dateRange = record.getString("date_range")
            val rangeMatch = Regex("(\\d+)-(\\d+)").find(dateRange)
            if (rangeMatch != null) {
                val startDay = rangeMatch.groupValues[1].toInt()
                val endDay = rangeMatch.groupValues[2].toInt()
                if (day in startDay..endDay) {
                    return record
                }
            }
        }
        return null
    }
    
    private fun extractPrayerTimes(record: JSONObject): List<PrayerTime> {
        return listOf(
            PrayerTime("Fajr", record.getString("fajr_adhan"), record.getString("fajr_iqamah")),
            PrayerTime("Dhuhr", record.getString("dhuhr_adhan"), record.getString("dhuhr_iqamah")),
            PrayerTime("Asr", record.getString("asr_adhan"), record.getString("asr_iqamah")),
            PrayerTime("Maghrib", record.getString("maghrib_adhan"), record.getString("maghrib_iqamah")),
            PrayerTime("Isha", record.getString("isha_adhan"), record.getString("isha_iqamah"))
        )
    }
    
    private fun findChanges(today: List<PrayerTime>, tomorrow: List<PrayerTime>): List<PrayerChange> {
        val changes = mutableListOf<PrayerChange>()
        
        for (i in today.indices) {
            if (i < tomorrow.size) {
                val todayPrayer = today[i]
                val tomorrowPrayer = tomorrow[i]
                
                // Compare Adhan times
                if (todayPrayer.adhan != tomorrowPrayer.adhan) {
                    changes.add(PrayerChange(
                        todayPrayer.name,
                        todayPrayer.adhan,
                        tomorrowPrayer.adhan
                    ))
                }
            }
        }
        
        return changes
    }
    
    private fun showChangeNotification(context: Context, changes: List<PrayerChange>) {
        createNotificationChannel(context)
        
        // Build the notification content
        val contentLines = changes.map { "${it.name}: ${it.oldTime} → ${it.newTime}" }
        val bigText = "Tomorrow onwards:\n" + contentLines.joinToString("\n")
        
        // Create intent to open app when notification is tapped
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🕌 Tomorrow's Prayer Times Changed!")
            .setContentText("${changes.size} prayer times are changing")
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
        
        Log.d(TAG, "📢 Showed prayer change notification")
    }
    
    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Prayer Time Changes",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications about prayer time changes"
            }
            
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun getMonthName(month: Int): String {
        return when (month) {
            Calendar.JANUARY -> "January"
            Calendar.FEBRUARY -> "February"
            Calendar.MARCH -> "March"
            Calendar.APRIL -> "April"
            Calendar.MAY -> "May"
            Calendar.JUNE -> "June"
            Calendar.JULY -> "July"
            Calendar.AUGUST -> "August"
            Calendar.SEPTEMBER -> "September"
            Calendar.OCTOBER -> "October"
            Calendar.NOVEMBER -> "November"
            Calendar.DECEMBER -> "December"
            else -> "January"
        }
    }
    
    /**
     * Pre-cache prayer data for the next 30 days.
     * Call this when app is open with internet for full offline reliability.
     */
    fun preCacheUpcomingData(context: Context) {
        try {
            val prefs = context.getSharedPreferences("prayer_times_native", Context.MODE_PRIVATE)
            val locationId = prefs.getString("selected_location_id", null) ?: return
            
            val today = Calendar.getInstance()
            val monthsToCache = mutableSetOf<String>()
            
            // Get months for next 30 days for full offline reliability
            for (i in 0..30) {
                val date = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, i) }
                monthsToCache.add(getMonthName(date.get(Calendar.MONTH)))
            }
            
            Log.d(TAG, "📦 Pre-caching prayer data for ${monthsToCache.size} months (30-day coverage)...")
            
            // Cache each month
            var cachedCount = 0
            for (month in monthsToCache) {
                if (getCachedPrayerData(context, locationId, month) == null) {
                    val data = fetchFromSupabase(locationId, month)
                    if (data != null) {
                        cachePrayerData(context, locationId, month, data)
                        cachedCount++
                    }
                }
            }
            
            Log.d(TAG, "✅ Pre-cached prayer data for $cachedCount new months (${monthsToCache.size} total)")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to pre-cache data", e)
        }
    }
    
    /**
     * Cache all available months for the current location.
     * Call this when the app has internet to maximize offline availability.
     */
    fun cacheAllAvailableMonths(context: Context) {
        Thread {
            try {
                val prefs = context.getSharedPreferences("prayer_times_native", Context.MODE_PRIVATE)
                val locationId = prefs.getString("selected_location_id", null) ?: return@Thread
                
                val allMonths = listOf(
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                )
                
                Log.d(TAG, "📦 Caching ALL 12 months for offline use...")
                
                var cachedCount = 0
                for (month in allMonths) {
                    val data = fetchFromSupabase(locationId, month)
                    if (data != null && data.length() > 0) {
                        cachePrayerData(context, locationId, month, data)
                        cachedCount++
                    }
                }
                
                // Mark that we've done full cache
                prefs.edit().putBoolean("full_year_cached", true).apply()
                prefs.edit().putLong("last_full_cache", System.currentTimeMillis()).apply()
                
                Log.d(TAG, "✅ Cached $cachedCount months for full offline support")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to cache all months", e)
            }
        }.start()
    }
}
