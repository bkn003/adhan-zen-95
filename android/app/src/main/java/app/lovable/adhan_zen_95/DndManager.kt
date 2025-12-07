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
 */
object DndManager {
    private const val TAG = "DndManager"
    private const val PREFS_NAME = "dnd_prefs"
    private const val KEY_PREVIOUS_FILTER = "previous_filter"
    private const val KEY_DND_ENABLED_BY_APP = "dnd_enabled_by_app"
    
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
    
    fun enableDnd(context: Context, prayerName: String = "Prayer"): Boolean {
        if (!hasPermission(context)) return false
        
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            val currentFilter = notificationManager.currentInterruptionFilter
            if (currentFilter != NotificationManager.INTERRUPTION_FILTER_NONE) {
                prefs.edit { putInt(KEY_PREVIOUS_FILTER, currentFilter) }
            }
            
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
            prefs.edit { putBoolean(KEY_DND_ENABLED_BY_APP, true) }
            
            Log.d(TAG, "DND enabled for $prayerName")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enable DND", e)
            return false
        }
    }
    
    fun disableDnd(context: Context): Boolean {
        if (!hasPermission(context)) return false
        
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            val enabledByApp = prefs.getBoolean(KEY_DND_ENABLED_BY_APP, false)
            if (!enabledByApp) return true
            
            val previousFilter = prefs.getInt(KEY_PREVIOUS_FILTER, NotificationManager.INTERRUPTION_FILTER_ALL)
            notificationManager.setInterruptionFilter(previousFilter)
            prefs.edit { putBoolean(KEY_DND_ENABLED_BY_APP, false) }
            
            Log.d(TAG, "DND disabled")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disable DND", e)
            return false
        }
    }
}
