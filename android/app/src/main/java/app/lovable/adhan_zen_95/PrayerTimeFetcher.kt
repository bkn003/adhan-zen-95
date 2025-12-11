package app.lovable.adhan_zen_95

import android.content.Context
import android.util.Log
import androidx.core.content.edit
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar

/**
 * Fetches prayer times from Supabase in the background.
 * This allows alarms to be scheduled even when the app hasn't been opened for days.
 */
object PrayerTimeFetcher {
    private const val TAG = "PrayerTimeFetcher"
    private const val PREFS_NAME = "prayer_times_native"
    private const val SUPABASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxodWZxbm9rbWRxa3Z6Y3hxd2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTIwMzksImV4cCI6MjA3MzIyODAzOX0.FHokW4gosyE7KuGowCtaGPBO-v7hxlh63lM6kRofwu4"
    
    /**
     * Fetch prayer times from Supabase and schedule alarms for today.
     * This is called by AdhanDailyUpdateReceiver at midnight.
     */
    fun fetchAndUpdatePrayerTimes(context: Context) {
        Log.d(TAG, "╔════════════════════════════════════════╗")
        Log.d(TAG, "║   FETCHING PRAYER TIMES FROM SUPABASE   ║")
        Log.d(TAG, "╚════════════════════════════════════════╝")
        
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val locationId = prefs.getString("selected_location_id", null)
            
            if (locationId == null) {
                Log.w(TAG, "⚠️ No location selected - cannot fetch prayer times")
                // Fall back to rescheduling with stored time strings
                fallbackToStoredTimes(context)
                return
            }
            
            Log.d(TAG, "📍 Location ID: $locationId")
            
            // Get current date info
            val today = Calendar.getInstance()
            val currentDay = today.get(Calendar.DAY_OF_MONTH)
            val currentMonth = getMonthName(today.get(Calendar.MONTH))
            val isFriday = today.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY
            
            Log.d(TAG, "📅 Date: $currentDay $currentMonth (Friday: $isFriday)")
            
            // Try to fetch from Supabase
            val prayerData = fetchPrayerTimesFromSupabase(locationId, currentMonth)
            
            if (prayerData != null) {
                Log.d(TAG, "✅ Fetched prayer times from Supabase")
                
                // Find the matching date range
                val matchingRecord = findMatchingDateRange(prayerData, currentDay)
                
                if (matchingRecord != null) {
                    Log.d(TAG, "✅ Found matching date range")
                    
                    // Store the data for future use
                    storePrayerData(context, matchingRecord, currentMonth)
                    
                    // Schedule alarms with the fetched data
                    scheduleAlarmsFromPrayerData(context, matchingRecord, isFriday)
                } else {
                    Log.w(TAG, "⚠️ No matching date range found for day $currentDay")
                    fallbackToStoredTimes(context)
                }
            } else {
                Log.w(TAG, "⚠️ Failed to fetch from Supabase - using cached data")
                fallbackToStoredTimes(context)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error fetching prayer times", e)
            fallbackToStoredTimes(context)
        }
    }
    
    private fun fetchPrayerTimesFromSupabase(locationId: String, month: String): JSONArray? {
        try {
            val urlString = "$SUPABASE_URL/rest/v1/prayer_times?location_id=eq.$locationId&month=eq.$month&select=*"
            Log.d(TAG, "🌐 Fetching: $urlString")
            
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "GET"
                setRequestProperty("apikey", SUPABASE_ANON_KEY)
                setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 15000
                readTimeout = 15000
            }
            
            val responseCode = connection.responseCode
            Log.d(TAG, "📡 Response code: $responseCode")
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()
                
                Log.d(TAG, "📦 Response length: ${response.length} chars")
                return JSONArray(response)
            } else {
                Log.e(TAG, "❌ HTTP error: $responseCode")
                return null
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Network error", e)
            return null
        }
    }
    
    private fun findMatchingDateRange(prayerData: JSONArray, currentDay: Int): JSONObject? {
        for (i in 0 until prayerData.length()) {
            val record = prayerData.getJSONObject(i)
            val dateRange = record.getString("date_range")
            
            // Parse date ranges like "1-5 May", "6-11 Nov", "12-17 Dec"
            val rangeMatch = Regex("(\\d+)-(\\d+)").find(dateRange)
            if (rangeMatch != null) {
                val startDay = rangeMatch.groupValues[1].toInt()
                val endDay = rangeMatch.groupValues[2].toInt()
                
                if (currentDay in startDay..endDay) {
                    Log.d(TAG, "📅 Matched date range: $dateRange (day $currentDay)")
                    return record
                }
            }
        }
        return null
    }
    
    private fun storePrayerData(context: Context, record: JSONObject, month: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit {
            putString("cached_prayer_data", record.toString())
            putString("cached_month", month)
            putLong("cached_timestamp", System.currentTimeMillis())
        }
        Log.d(TAG, "💾 Stored prayer data in SharedPreferences")
    }
    
    private fun scheduleAlarmsFromPrayerData(context: Context, record: JSONObject, isFriday: Boolean) {
        val today = Calendar.getInstance()
        val year = today.get(Calendar.YEAR)
        val month = today.get(Calendar.MONTH)
        val day = today.get(Calendar.DAY_OF_MONTH)
        
        Log.d(TAG, "⏰ Scheduling alarms for $day/${month+1}/$year")
        
        // Prayer times from the record
        val prayers = listOf(
            Triple(0, "Fajr", record.getString("fajr_adhan") to record.getString("fajr_iqamah")),
            Triple(1, if (isFriday) "Jummah" else "Zuhr", 
                (if (isFriday && record.has("jummah_adhan")) record.getString("jummah_adhan") else record.getString("dhuhr_adhan")) to
                (if (isFriday && record.has("jummah_iqamah")) record.getString("jummah_iqamah") else record.getString("dhuhr_iqamah"))),
            Triple(2, "Asr", record.getString("asr_adhan") to record.getString("asr_iqamah")),
            Triple(3, "Maghrib", record.getString("maghrib_adhan") to record.getString("maghrib_iqamah")),
            Triple(4, "Isha", record.getString("isha_adhan") to record.getString("isha_iqamah"))
        )
        
        var scheduledCount = 0
        
        for ((index, name, times) in prayers) {
            val (adhanStr, iqamahStr) = times
            
            val adhanMillis = parseTimeToMillis(adhanStr, year, month, day)
            val iqamahMillis = parseTimeToMillis(iqamahStr, year, month, day)
            
            if (adhanMillis > System.currentTimeMillis()) {
                // Schedule Adhan alarm
                ReliableAlarmScheduler.scheduleAdhanAlarm(
                    context, adhanMillis, name, index, iqamahMillis, adhanStr, iqamahStr
                )
                
                // Schedule DND
                if (iqamahMillis > System.currentTimeMillis()) {
                    DndScheduler.scheduleDndForPrayer(
                        context, iqamahMillis, name, index, 
                        DndScheduler.DEFAULT_DND_BEFORE_IQAMAH, 
                        DndScheduler.DEFAULT_DND_AFTER_IQAMAH, 
                        iqamahStr
                    )
                }
                
                // For Isha (index 4), also schedule the prayer change notification
                if (index == 4 && adhanMillis > System.currentTimeMillis()) {
                    PrayerChangeReceiver.scheduleBeforeIsha(context, adhanMillis)
                }
                
                Log.d(TAG, "📿 Scheduled $name - Adhan: $adhanStr, Iqamah: $iqamahStr")
                scheduledCount++
            } else {
                Log.d(TAG, "⏭️ Skipped $name - time already passed")
            }
        }
        
        Log.d(TAG, "✅ Scheduled $scheduledCount prayers for today")
    }
    
    private fun fallbackToStoredTimes(context: Context) {
        Log.d(TAG, "🔄 Falling back to stored time strings...")
        
        // First try to use cached prayer data
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val cachedData = prefs.getString("cached_prayer_data", null)
        
        if (cachedData != null) {
            try {
                val record = JSONObject(cachedData)
                val today = Calendar.getInstance()
                val isFriday = today.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY
                
                Log.d(TAG, "📦 Using cached prayer data")
                scheduleAlarmsFromPrayerData(context, record, isFriday)
                return
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Failed to parse cached data", e)
            }
        }
        
        // Final fallback: use rescheduleForNewDay
        Log.d(TAG, "📅 Using rescheduleForNewDay fallback")
        ReliableAlarmScheduler.rescheduleForNewDay(context)
        DndScheduler.rescheduleForNewDay(context)
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
     * Save the user's selected location ID for background fetching.
     * This is called from the web app when the user selects a location.
     */
    fun saveSelectedLocation(context: Context, locationId: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            putString("selected_location_id", locationId)
        }
        Log.d(TAG, "💾 Saved selected location: $locationId")
    }
    
    /**
     * Get the stored location ID.
     */
    fun getSelectedLocation(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString("selected_location_id", null)
    }
}
