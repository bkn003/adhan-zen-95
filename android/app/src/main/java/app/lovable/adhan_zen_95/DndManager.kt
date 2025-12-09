package app.lovable.adhan_zen_95

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.edit

/**
 * Singleton manager for Do Not Disturb (DND) functionality
 * Uses multiple fallback mechanisms for maximum reliability
 */
object DndManager {
    private const val TAG = "DndManager"
    private const val PREFS_NAME = "dnd_prefs"
    private const val KEY_PREVIOUS_FILTER = "previous_filter"
    private const val KEY_DND_ENABLED_BY_APP = "dnd_enabled_by_app"
    private const val KEY_PREVIOUS_RINGER_MODE = "previous_ringer_mode"
    private const val KEY_PREVIOUS_RING_VOLUME = "previous_ring_volume"
    private const val KEY_PREVIOUS_NOTIFICATION_VOLUME = "previous_notification_volume"
    
    fun hasPermission(context: Context): Boolean {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return notificationManager.isNotificationPolicyAccessGranted
    }
    
    fun requestPermission(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open DND settings", e)
        }
    }
    
    /**
     * Enable DND with maximum strength - uses multiple fallback mechanisms
     */
    fun enableDnd(context: Context, prayerName: String = "Prayer"): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var success = false
        
        // Method 1: Use NotificationManager DND (requires DND permission)
        if (hasPermission(context)) {
            try {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                val currentFilter = notificationManager.currentInterruptionFilter
                if (currentFilter != NotificationManager.INTERRUPTION_FILTER_NONE) {
                    prefs.edit { putInt(KEY_PREVIOUS_FILTER, currentFilter) }
                }
                
                // Use INTERRUPTION_FILTER_ALARMS - allows alarms but silences everything else
                // This is more reliable than NONE on some devices
                notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALARMS)
                prefs.edit { putBoolean(KEY_DND_ENABLED_BY_APP, true) }
                
                Log.d(TAG, "✅ DND enabled via NotificationManager (ALARMS mode) for $prayerName")
                success = true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to enable DND via NotificationManager", e)
            }
        }
        
        // Method 2: Also use AudioManager as additional layer (always try this)
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            
            // Save previous volumes and ringer mode
            prefs.edit {
                putInt(KEY_PREVIOUS_RINGER_MODE, audioManager.ringerMode)
                putInt(KEY_PREVIOUS_RING_VOLUME, audioManager.getStreamVolume(android.media.AudioManager.STREAM_RING))
                putInt(KEY_PREVIOUS_NOTIFICATION_VOLUME, audioManager.getStreamVolume(android.media.AudioManager.STREAM_NOTIFICATION))
            }
            
            // Set to silent and mute volumes
            audioManager.ringerMode = android.media.AudioManager.RINGER_MODE_SILENT
            audioManager.setStreamVolume(android.media.AudioManager.STREAM_RING, 0, 0)
            audioManager.setStreamVolume(android.media.AudioManager.STREAM_NOTIFICATION, 0, 0)
            
            Log.d(TAG, "✅ AudioManager: Ringer set to SILENT, volumes muted")
            success = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to mute via AudioManager", e)
        }
        
        if (success) {
            Log.d(TAG, "🔇 DND FULLY ENABLED for $prayerName")
        }
        
        return success
    }
    
    /**
     * Disable DND and restore previous settings.
     * Returns true if DND was disabled successfully, false if DND was never enabled by this app.
     * IMPORTANT: This will return false (and NOT restore settings) if DND was never enabled,
     * preventing the erroneous "DND Deactivated" notification.
     */
    fun disableDnd(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        val enabledByApp = prefs.getBoolean(KEY_DND_ENABLED_BY_APP, false)
        if (!enabledByApp) {
            Log.d(TAG, "⚠️ DND was NOT enabled by app - skipping deactivation (no notification will be shown)")
            // Return false to indicate DND was never enabled, so caller should NOT show notification
            return false
        }
        
        var success = false
        
        // Method 1: Restore NotificationManager DND
        if (hasPermission(context)) {
            try {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val previousFilter = prefs.getInt(KEY_PREVIOUS_FILTER, NotificationManager.INTERRUPTION_FILTER_ALL)
                notificationManager.setInterruptionFilter(previousFilter)
                
                Log.d(TAG, "✅ NotificationManager: Restored to filter $previousFilter")
                success = true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restore DND via NotificationManager", e)
            }
        }
        
        // Method 2: Restore AudioManager volumes
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            
            val previousRingerMode = prefs.getInt(KEY_PREVIOUS_RINGER_MODE, android.media.AudioManager.RINGER_MODE_NORMAL)
            val previousRingVolume = prefs.getInt(KEY_PREVIOUS_RING_VOLUME, -1)
            val previousNotificationVolume = prefs.getInt(KEY_PREVIOUS_NOTIFICATION_VOLUME, -1)
            
            audioManager.ringerMode = previousRingerMode
            
            if (previousRingVolume >= 0) {
                audioManager.setStreamVolume(android.media.AudioManager.STREAM_RING, previousRingVolume, 0)
            }
            if (previousNotificationVolume >= 0) {
                audioManager.setStreamVolume(android.media.AudioManager.STREAM_NOTIFICATION, previousNotificationVolume, 0)
            }
            
            Log.d(TAG, "✅ AudioManager: Ringer mode restored to $previousRingerMode")
            success = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to restore via AudioManager", e)
        }
        
        // Clear the enabled flag
        prefs.edit { putBoolean(KEY_DND_ENABLED_BY_APP, false) }
        
        if (success) {
            Log.d(TAG, "🔔 DND FULLY DISABLED")
        }
        
        return success
    }
}
