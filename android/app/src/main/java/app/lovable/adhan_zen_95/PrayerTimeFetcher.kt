package app.lovable.adhan_zen_95

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.*

/**
 * Fetches prayer times from the API and updates stored data in background
 */
object PrayerTimeFetcher {
    
    private const val TAG = "PrayerTimeFetcher"
    private const val PREFS_NAME = "CapacitorPreferences"
    private const val KEY_LOCATION_ID = "selected_location_id"
    private const val KEY_PRAYER_DATA = "today_prayers"
    
    fun fetchAndUpdatePrayerTimes(context: Context): Boolean {
        try {
            Log.d(TAG, "Starting background prayer time fetch...")
            
            // Get stored location ID
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val locationId = prefs.getString(KEY_LOCATION_ID, null)
            
            if (locationId.isNullOrEmpty()) {
                Log.w(TAG, "No location selected, skipping update")
                return false
            }
            
            // Get today's date
            val today = Calendar.getInstance()
            val dateStr = String.format("%04d-%02d-%02d", 
                today.get(Calendar.YEAR),
                today.get(Calendar.MONTH) + 1,
                today.get(Calendar.DAY_OF_MONTH))
            
            // Fetch prayer times from API
            val apiUrl = "https://kgpbqcsmjqcjkmijdafx.supabase.co/functions/v1/prayer-times?location_id=$locationId&date=$dateStr"
            val prayerData = fetchFromApi(apiUrl)
            
            if (prayerData != null) {
                // Save to preferences
                val prayerJson = JSONObject().apply {
                    put("prayers", prayerData.getJSONArray("prayers"))
                    put("date", today.timeInMillis)
                }
                
                prefs.edit().putString(KEY_PRAYER_DATA, prayerJson.toString()).apply()
                Log.d(TAG, "Prayer times updated successfully")
                
                // Reschedule alarms
                AdhanRescheduler.rescheduleNotifications(context)
                return true
            } else {
                Log.w(TAG, "Failed to fetch prayer times from API")
                return false
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching prayer times", e)
            return false
        }
    }
    
    private fun fetchFromApi(urlString: String): JSONObject? {
        var connection: HttpURLConnection? = null
        try {
            val url = URL(urlString)
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            
            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = StringBuilder()
                var line: String?
                
                while (reader.readLine().also { line = it } != null) {
                    response.append(line)
                }
                reader.close()
                
                return JSONObject(response.toString())
            } else {
                Log.w(TAG, "API returned code: $responseCode")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network error", e)
        } finally {
            connection?.disconnect()
        }
        return null
    }
}
