package app.lovable.adhan_zen_95

import android.util.Log
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject
import com.getcapacitor.JSArray

@CapacitorPlugin(name = "AdhanNative")
class AdhanNativePlugin : Plugin() {
    
    @PluginMethod
    fun checkDndPermission(call: PluginCall) {
        val result = JSObject()
        result.put("granted", DndManager.hasPermission(context))
        call.resolve(result)
    }
    
    @PluginMethod
    fun requestDndPermission(call: PluginCall) {
        DndManager.requestPermission(context)
        call.resolve()
    }
    
    @PluginMethod
    fun enableDnd(call: PluginCall) {
        val prayerName = call.getString("prayerName") ?: "Prayer"
        val result = JSObject()
        result.put("success", DndManager.enableDnd(context, prayerName))
        call.resolve(result)
    }
    
    @PluginMethod
    fun disableDnd(call: PluginCall) {
        val result = JSObject()
        result.put("success", DndManager.disableDnd(context))
        call.resolve(result)
    }
    
    @PluginMethod
    fun scheduleDndForPrayers(call: PluginCall) {
        try {
            val prayers = call.getArray("prayers") ?: return call.reject("Missing prayers")
            val dateStr = call.getString("date") ?: return call.reject("Missing date")
            val beforeMin = call.getInt("dndBeforeMinutes") ?: 5
            val afterMin = call.getInt("dndAfterMinutes") ?: 15
            
            val parts = dateStr.split("-")
            val year = parts[0].toInt()
            val month = parts[1].toInt() - 1
            val day = parts[2].toInt()
            
            val types = listOf("fajr", "dhuhr", "asr", "maghrib", "isha")
            var count = 0
            
            for (i in 0 until prayers.length()) {
                val p = prayers.getJSONObject(i)
                val type = p.getString("type")
                val idx = types.indexOf(type)
                if (idx >= 0 && p.has("iqamah")) {
                    val iqamahStr = p.getString("iqamah")
                    val iqamahMillis = parseTime(iqamahStr, year, month, day)
                    if (iqamahMillis > System.currentTimeMillis()) {
                        // Pass the time string for new day rescheduling
                        DndScheduler.scheduleDndForPrayer(context, iqamahMillis, p.getString("name"), idx, beforeMin, afterMin, iqamahStr)
                        count++
                    }
                }
            }
            
            val result = JSObject()
            result.put("scheduledCount", count)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Error: ${e.message}")
        }
    }
    
    @PluginMethod
    fun scheduleReliableAlarms(call: PluginCall) {
        try {
            val prayers = call.getArray("prayers") ?: return call.reject("Missing prayers")
            val dateStr = call.getString("date") ?: return call.reject("Missing date")
            
            val parts = dateStr.split("-")
            val year = parts[0].toInt()
            val month = parts[1].toInt() - 1
            val day = parts[2].toInt()
            
            val types = listOf("fajr", "dhuhr", "asr", "maghrib", "isha")
            var count = 0
            
            for (i in 0 until prayers.length()) {
                val p = prayers.getJSONObject(i)
                val type = p.getString("type")
                val idx = types.indexOf(type)
                if (idx >= 0 && p.has("adhan")) {
                    val adhanStr = p.getString("adhan")
                    val iqamahStr = if (p.has("iqamah")) p.getString("iqamah") else ""
                    val adhanMillis = parseTime(adhanStr, year, month, day)
                    val iqamahMillis = if (iqamahStr.isNotEmpty()) parseTime(iqamahStr, year, month, day) else 0L
                    if (adhanMillis > System.currentTimeMillis()) {
                        // Pass time strings for new day rescheduling
                        ReliableAlarmScheduler.scheduleAdhanAlarm(context, adhanMillis, p.getString("name"), idx, iqamahMillis, adhanStr, iqamahStr)
                        count++
                    }
                }
            }
            
            val result = JSObject()
            result.put("scheduledCount", count)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Error: ${e.message}")
        }
    }
    
    @PluginMethod
    fun cancelAllAlarms(call: PluginCall) {
        DndScheduler.cancelAllDndAlarms(context)
        ReliableAlarmScheduler.cancelAllAlarms(context)
        call.resolve(JSObject().apply { put("success", true) })
    }
    
    @PluginMethod
    fun getDndSettings(call: PluginCall) {
        val prefs = context.getSharedPreferences("dnd_user_settings", android.content.Context.MODE_PRIVATE)
        val result = JSObject()
        result.put("enabled", prefs.getBoolean("dnd_enabled", true))
        result.put("beforeMinutes", prefs.getInt("dnd_before_minutes", 5))
        result.put("afterMinutes", prefs.getInt("dnd_after_minutes", 15))
        val arr = JSArray()
        listOf("fajr", "dhuhr", "asr", "maghrib", "isha").forEach { if (prefs.getBoolean("dnd_$it", true)) arr.put(it) }
        result.put("enabledPrayers", arr)
        call.resolve(result)
    }
    
    @PluginMethod
    fun saveDndSettings(call: PluginCall) {
        val prefs = context.getSharedPreferences("dnd_user_settings", android.content.Context.MODE_PRIVATE)
        prefs.edit().apply {
            call.getBoolean("enabled")?.let { putBoolean("dnd_enabled", it) }
            call.getInt("beforeMinutes")?.let { putInt("dnd_before_minutes", it) }
            call.getInt("afterMinutes")?.let { putInt("dnd_after_minutes", it) }
            call.getArray("enabledPrayers")?.let { arr ->
                listOf("fajr", "dhuhr", "asr", "maghrib", "isha").forEach { t ->
                    putBoolean("dnd_$t", (0 until arr.length()).any { arr.getString(it) == t })
                }
            }
            apply()
        }
        call.resolve()
    }
    
    @PluginMethod
    fun updateCountdownPrayers(call: PluginCall) {
        try {
            val prayers = call.getArray("prayers") ?: return call.reject("Missing prayers")
            
            // Build JSON string for the service
            val jsonBuilder = StringBuilder("[")
            for (i in 0 until prayers.length()) {
                val p = prayers.getJSONObject(i)
                if (i > 0) jsonBuilder.append(",")
                jsonBuilder.append("{")
                jsonBuilder.append("\"name\":\"${p.getString("name")}\",")
                jsonBuilder.append("\"adhan\":\"${p.getString("adhan")}\"")
                jsonBuilder.append("}")
            }
            jsonBuilder.append("]")
            
            val serviceIntent = android.content.Intent(context, PrayerCountdownService::class.java).apply {
                action = PrayerCountdownService.ACTION_UPDATE_PRAYERS
                putExtra(PrayerCountdownService.EXTRA_PRAYERS_JSON, jsonBuilder.toString())
            }
            androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent)
            
            Log.d("AdhanNativePlugin", "Updated countdown service with ${prayers.length()} prayers")
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            Log.e("AdhanNativePlugin", "Failed to update countdown prayers", e)
            call.reject("Error: ${e.message}")
        }
    }
    
    private fun parseTime(timeStr: String, year: Int, month: Int, day: Int): Long {
        val cal = java.util.Calendar.getInstance()
        cal.set(year, month, day, 0, 0, 0)
        cal.set(java.util.Calendar.MILLISECOND, 0)
        
        val t = timeStr.trim()
        var h: Int; var m: Int
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
    
    /**
     * Save the user's selected location ID for background prayer time fetching.
     * This must be called whenever the user selects a different location.
     */
    @PluginMethod
    fun saveSelectedLocation(call: PluginCall) {
        val locationId = call.getString("locationId") ?: return call.reject("Missing locationId")
        
        PrayerTimeFetcher.saveSelectedLocation(context, locationId)
        Log.d("AdhanNativePlugin", "💾 Saved selected location: $locationId")
        
        call.resolve(JSObject().apply { put("success", true) })
    }
    
    /**
     * Get the currently selected location ID.
     */
    @PluginMethod
    fun getSelectedLocation(call: PluginCall) {
        val locationId = PrayerTimeFetcher.getSelectedLocation(context)
        val result = JSObject()
        result.put("locationId", locationId)
        call.resolve(result)
    }
    
    /**
     * Manually trigger a background fetch of prayer times.
     * Useful for testing or forcing an update.
     */
    @PluginMethod
    fun refreshPrayerTimes(call: PluginCall) {
        Thread {
            try {
                PrayerTimeFetcher.fetchAndUpdatePrayerTimes(context)
                activity?.runOnUiThread {
                    call.resolve(JSObject().apply { put("success", true) })
                }
            } catch (e: Exception) {
                activity?.runOnUiThread {
                    call.reject("Error: ${e.message}")
                }
            }
        }.start()
    }
    
    // ========== Battery Optimization Methods ==========
    
    /**
     * Check if app is ignoring battery optimizations
     */
    @PluginMethod
    fun checkBatteryOptimization(call: PluginCall) {
        val result = JSObject()
        result.put("isIgnoring", BatteryOptimizationHelper.isIgnoringBatteryOptimizations(context))
        result.put("isAggressiveDevice", BatteryOptimizationHelper.isAggressiveBatteryManufacturer())
        result.put("manufacturer", BatteryOptimizationHelper.getDeviceManufacturer())
        result.put("shouldShowPrompt", BatteryOptimizationHelper.shouldShowPrompt(context))
        call.resolve(result)
    }
    
    /**
     * Request to disable battery optimization (shows system dialog)
     */
    @PluginMethod
    fun requestBatteryOptimization(call: PluginCall) {
        BatteryOptimizationHelper.requestDisableBatteryOptimization(context)
        call.resolve()
    }
    
    /**
     * Open manufacturer-specific battery/autostart settings
     */
    @PluginMethod
    fun openManufacturerBatterySettings(call: PluginCall) {
        BatteryOptimizationHelper.openManufacturerBatterySettings(context)
        call.resolve()
    }
    
    /**
     * Mark battery optimization prompt as ignored by user
     */
    @PluginMethod
    fun ignoreBatteryOptimizationPrompt(call: PluginCall) {
        BatteryOptimizationHelper.ignoreOptimizationPrompt(context)
        call.resolve()
    }

    // ========== Adhan Sound Selection Methods ==========
    
    @PluginMethod
    fun getAvailableAdhans(call: PluginCall) {
        val adhans = AdhanSoundManager.getAvailableAdhans()
        val jsonArray = JSArray()
        adhans.forEach { 
            val obj = JSObject()
            obj.put("id", it["id"])
            obj.put("name", it["name"])
            obj.put("description", it["description"])
            jsonArray.put(obj)
        }
        
        val result = JSObject()
        result.put("adhans", jsonArray)
        call.resolve(result)
    }
    
    @PluginMethod
    fun getAdhanSettings(call: PluginCall) {
        val result = JSObject()
        result.put("selectedAdhan", AdhanSoundManager.getSelectedAdhan(context).resourceName)
        result.put("fajrAdhan", AdhanSoundManager.getFajrAdhan(context).resourceName)
        result.put("volume", AdhanSoundManager.getAdhanVolume(context))
        call.resolve(result)
    }
    
    @PluginMethod
    fun setAdhanSelection(call: PluginCall) {
        try {
            val adhanId = call.getString("adhanId")
            val isFajr = call.getBoolean("isFajr") ?: false
            
            if (adhanId != null) {
                val type = AdhanSoundManager.AdhanType.fromResourceName(adhanId)
                if (isFajr) {
                    AdhanSoundManager.setFajrAdhan(context, type)
                } else {
                    AdhanSoundManager.setSelectedAdhan(context, type)
                }
            }
            
            val volume = call.getInt("volume")
            if (volume != null) {
                AdhanSoundManager.setAdhanVolume(context, volume)
            }
            
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Error saving adhan settings: ${e.message}")
        }
    }
    
    // ========== Vibration Settings Methods ==========
    
    @PluginMethod
    fun getVibrationSettings(call: PluginCall) {
        val result = JSObject()
        result.put("enabled", AdhanSoundManager.getVibrationEnabled(context))
        result.put("patternId", AdhanSoundManager.getVibrationPattern(context).id)
        
        val patterns = JSArray()
        AdhanSoundManager.getAvailableVibrationPatterns().forEach {
            val obj = JSObject()
            obj.put("id", it["id"])
            obj.put("name", it["name"])
            patterns.put(obj)
        }
        result.put("patterns", patterns)
        
        call.resolve(result)
    }

    @PluginMethod
    fun setVibrationSettings(call: PluginCall) {
        val enabled = call.getBoolean("enabled")
        if (enabled != null) {
             AdhanSoundManager.setVibrationEnabled(context, enabled)
        }
        
        val patternId = call.getString("patternId")
        if (patternId != null) {
            AdhanSoundManager.setVibrationPattern(context, patternId)
        }
        
        call.resolve()
    }
}
