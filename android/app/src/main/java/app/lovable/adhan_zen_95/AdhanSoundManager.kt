package app.lovable.adhan_zen_95

import android.content.Context
import android.util.Log

/**
 * Manager for adhan sound selection and settings.
 * Supports multiple adhan sounds that users can choose from.
 */
object AdhanSoundManager {
    private const val TAG = "AdhanSoundManager"
    private const val PREFS_NAME = "adhan_sound_prefs"
    private const val KEY_SELECTED_ADHAN = "selected_adhan"
    private const val KEY_FAJR_ADHAN = "fajr_adhan"
    private const val KEY_VOLUME = "adhan_volume"
    private const val KEY_VIBRATION_ENABLED = "vibration_enabled"
    private const val KEY_VIBRATION_PATTERN = "vibration_pattern"

    enum class VibrationPattern(val id: String, val displayName: String, val pattern: LongArray) {
        // Pattern: [delay, vibrate, sleep, vibrate]
        SHORT("short", "Short Pulse", longArrayOf(0, 500, 1000)),
        LONG("long", "Long Pulse", longArrayOf(0, 1500, 1000)),
        HEARTBEAT("heartbeat", "Heartbeat", longArrayOf(0, 200, 100, 200, 1000)),
        RAPID("rapid", "Rapid Alert", longArrayOf(0, 200, 200));

        companion object {
            fun fromId(id: String): VibrationPattern = values().find { it.id == id } ?: SHORT
        }
    }
    
    /**
     * Available adhan sounds with their resource names and display names
     */
    enum class AdhanType(val resourceName: String, val displayName: String, val description: String) {
        MAKKAH("adhan", "Makkah", "Traditional Makkah adhan"),
        MADINAH("adhan_madinah", "Madinah", "Traditional Madinah adhan"),
        MISHARY("adhan_mishary", "Mishary Rashid", "Mishary Rashid Al-Afasy"),
        ABDUL_BASIT("adhan_abdul_basit", "Abdul Basit", "Sheikh Abdul Basit"),
        SIMPLE_BEEP("adhan_beep", "Simple Beep", "Short notification beep");
        
        companion object {
            fun fromResourceName(name: String): AdhanType {
                return values().find { it.resourceName == name } ?: MAKKAH
            }
        }
    }
    
    /**
     * Get the currently selected adhan type
     */
    fun getSelectedAdhan(context: Context): AdhanType {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val resourceName = prefs.getString(KEY_SELECTED_ADHAN, AdhanType.MAKKAH.resourceName)
        return AdhanType.fromResourceName(resourceName ?: AdhanType.MAKKAH.resourceName)
    }
    
    /**
     * Set the selected adhan type
     */
    fun setSelectedAdhan(context: Context, adhanType: AdhanType) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_SELECTED_ADHAN, adhanType.resourceName)
            .apply()
        Log.d(TAG, "Selected adhan: ${adhanType.displayName}")
    }
    
    /**
     * Get the adhan for Fajr (can be different from regular adhan)
     */
    fun getFajrAdhan(context: Context): AdhanType {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        // Default to same as regular adhan if not set
        val defaultAdhan = getSelectedAdhan(context)
        val resourceName = prefs.getString(KEY_FAJR_ADHAN, defaultAdhan.resourceName)
        return AdhanType.fromResourceName(resourceName ?: defaultAdhan.resourceName)
    }
    
    /**
     * Set a special adhan for Fajr prayer
     */
    fun setFajrAdhan(context: Context, adhanType: AdhanType) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_FAJR_ADHAN, adhanType.resourceName)
            .apply()
        Log.d(TAG, "Fajr adhan: ${adhanType.displayName}")
    }
    
    /**
     * Get the adhan resource name based on prayer name
     */
    fun getAdhanForPrayer(context: Context, prayerName: String): String {
        return if (prayerName.contains("Fajr", ignoreCase = true)) {
            getFajrAdhan(context).resourceName
        } else {
            getSelectedAdhan(context).resourceName
        }
    }
    
    /**
     * Get adhan volume (0-100)
     */
    fun getAdhanVolume(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getInt(KEY_VOLUME, 100) // Default full volume
    }
    
    /**
     * Set adhan volume (0-100)
     */
    fun setAdhanVolume(context: Context, volume: Int) {
        val clampedVolume = volume.coerceIn(0, 100)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_VOLUME, clampedVolume)
            .apply()
        Log.d(TAG, "Adhan volume: $clampedVolume%")
    }
    
    /**
     * Get the resource ID for an adhan
     * Falls back to default adhan if resource not found
     */
    fun getAdhanResourceId(context: Context, resourceName: String): Int {
        val resId = context.resources.getIdentifier(resourceName, "raw", context.packageName)
        if (resId == 0) {
            Log.w(TAG, "Adhan resource not found: $resourceName, falling back to default")
            return context.resources.getIdentifier("adhan", "raw", context.packageName)
        }
        return resId
    }
    
    /**
     * Get list of all available adhans as JSON-like structure for web app
     */
    fun getAvailableAdhans(): List<Map<String, String>> {
        return AdhanType.values().map { adhan ->
            mapOf(
                "id" to adhan.resourceName,
                "name" to adhan.displayName,
                "description" to adhan.description
            )
        }
    }
    
    fun getVibrationEnabled(context: Context): Boolean {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_VIBRATION_ENABLED, true)
    }
    
    fun setVibrationEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_VIBRATION_ENABLED, enabled)
            .apply()
    }
    
    fun getVibrationPattern(context: Context): VibrationPattern {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val id = prefs.getString(KEY_VIBRATION_PATTERN, VibrationPattern.SHORT.id)
        return VibrationPattern.fromId(id ?: VibrationPattern.SHORT.id)
    }
    
    fun setVibrationPattern(context: Context, patternId: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_VIBRATION_PATTERN, patternId)
            .apply()
    }
    
    fun getAvailableVibrationPatterns(): List<Map<String, Any>> {
        return VibrationPattern.values().map {
            mapOf(
                "id" to it.id,
                "name" to it.displayName
            )
        }
    }
}
