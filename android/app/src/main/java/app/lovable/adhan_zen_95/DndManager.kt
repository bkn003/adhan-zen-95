package app.lovable.adhan_zen_95

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.edit

/**
 * Singleton manager for Do Not Disturb (DND) functionality
 * 
 * IMPLEMENTATION STRATEGY:
 * 1. PRIMARY: Use NotificationManager DND (proper moon symbol) if permission granted
 * 2. FALLBACK: Use AudioManager ringer mode ONLY if DND permission is NOT granted
 * 
 * This ensures:
 * - Proper DND icon (moon symbol) appears when permission is granted
 * - Reliable deactivation - phone properly unmutes after prayer time
 * - AudioManager is ONLY used when DND permission is unavailable
 */
object DndManager {
    private const val TAG = "DndManager"
    private const val PREFS_NAME = "dnd_prefs"
    private const val KEY_PREVIOUS_FILTER = "previous_filter"
    private const val KEY_DND_ENABLED_BY_APP = "dnd_enabled_by_app"
    private const val KEY_USED_AUDIO_MANAGER_FALLBACK = "used_audio_manager_fallback"
    private const val KEY_PREVIOUS_RINGER_MODE = "previous_ringer_mode"
    
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
     * Enable DND mode
     * Uses NotificationManager (proper DND) if permission granted, otherwise falls back to AudioManager
     */
    fun enableDnd(context: Context, prayerName: String = "Prayer"): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        // PRIMARY: Use NotificationManager DND if permission is granted
        if (hasPermission(context)) {
            try {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                // Save current filter to restore later
                val currentFilter = notificationManager.currentInterruptionFilter
                if (currentFilter != NotificationManager.INTERRUPTION_FILTER_NONE && 
                    currentFilter != NotificationManager.INTERRUPTION_FILTER_ALARMS) {
                    prefs.edit { putInt(KEY_PREVIOUS_FILTER, currentFilter) }
                }
                
                // Set to PRIORITY mode - this shows the moon symbol and silences most notifications
                // INTERRUPTION_FILTER_PRIORITY allows priority calls/messages through if configured
                notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
                
                prefs.edit { 
                    putBoolean(KEY_DND_ENABLED_BY_APP, true)
                    putBoolean(KEY_USED_AUDIO_MANAGER_FALLBACK, false)
                }
                
                Log.d(TAG, "✅ DND ENABLED via NotificationManager (PRIORITY mode - moon symbol) for $prayerName")
                Log.d(TAG, "   Current filter now: ${notificationManager.currentInterruptionFilter}")
                return true
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to enable DND via NotificationManager, trying AudioManager fallback", e)
            }
        }
        
        // FALLBACK: Use AudioManager if DND permission NOT granted
        Log.d(TAG, "⚠️ No DND permission - using AudioManager fallback (silent mode)")
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            // Save previous ringer mode
            prefs.edit {
                putInt(KEY_PREVIOUS_RINGER_MODE, audioManager.ringerMode)
            }
            
            // Set to vibrate mode (better than silent for user awareness)
            audioManager.ringerMode = AudioManager.RINGER_MODE_VIBRATE
            
            prefs.edit { 
                putBoolean(KEY_DND_ENABLED_BY_APP, true)
                putBoolean(KEY_USED_AUDIO_MANAGER_FALLBACK, true)
            }
            
            Log.d(TAG, "✅ AudioManager: Ringer set to VIBRATE for $prayerName (fallback mode)")
            return true
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set ringer mode via AudioManager", e)
            return false
        }
    }
    
    /**
     * Disable DND and restore previous settings
     * Returns true if DND was disabled successfully
     */
    fun disableDnd(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        val enabledByApp = prefs.getBoolean(KEY_DND_ENABLED_BY_APP, false)
        if (!enabledByApp) {
            Log.d(TAG, "⚠️ DND was NOT enabled by app - skipping deactivation")
            return false
        }
        
        val usedAudioManagerFallback = prefs.getBoolean(KEY_USED_AUDIO_MANAGER_FALLBACK, false)
        var success = false
        
        if (!usedAudioManagerFallback && hasPermission(context)) {
            // Restore NotificationManager DND
            try {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                
                // Restore to ALL (normal mode) - guaranteed to work
                notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
                
                Log.d(TAG, "✅ NotificationManager: Restored to INTERRUPTION_FILTER_ALL (normal)")
                Log.d(TAG, "   Current filter now: ${notificationManager.currentInterruptionFilter}")
                success = true
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restore DND via NotificationManager", e)
            }
        } else {
            // Restore AudioManager ringer mode
            try {
                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                
                // ALWAYS force restore to NORMAL mode to ensure phone is unmuted
                audioManager.ringerMode = AudioManager.RINGER_MODE_NORMAL
                
                Log.d(TAG, "✅ AudioManager: Ringer mode FORCED to NORMAL")
                Log.d(TAG, "   Current ringer mode: ${audioManager.ringerMode}")
                success = true
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restore via AudioManager", e)
            }
        }
        
        // Clear the enabled flag
        prefs.edit { 
            putBoolean(KEY_DND_ENABLED_BY_APP, false)
            putBoolean(KEY_USED_AUDIO_MANAGER_FALLBACK, false)
        }
        
        if (success) {
            Log.d(TAG, "🔔 DND FULLY DISABLED - phone should be in normal mode now")
        }
        
        return success
    }
    
    /**
     * Play a notification sound for DND status change
     * Uses ToneGenerator for reliable playback even in different audio states
     */
    fun playStatusSound(context: Context, isActivating: Boolean) {
        try {
            // Temporarily ensure we can play sounds
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            // For deactivation, we might need to force audio stream
            val streamType = if (isActivating) {
                AudioManager.STREAM_NOTIFICATION
            } else {
                AudioManager.STREAM_RING
            }
            
            val toneType = if (isActivating) {
                ToneGenerator.TONE_PROP_ACK  // Short acknowledgement beep for activation
            } else {
                ToneGenerator.TONE_PROP_BEEP2  // Distinctive beep for deactivation
            }
            
            val toneGenerator = ToneGenerator(streamType, 80) // 80% volume
            toneGenerator.startTone(toneType, 300) // 300ms duration
            
            // Release after a delay
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                try {
                    toneGenerator.release()
                } catch (e: Exception) {
                    Log.w(TAG, "Error releasing ToneGenerator", e)
                }
            }, 500)
            
            Log.d(TAG, "🔊 Played status sound: ${if (isActivating) "activation" else "deactivation"}")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play status sound", e)
        }
    }
}
