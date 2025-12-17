package app.lovable.adhan_zen_95

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * BroadcastReceiver for DND ON/OFF alarms
 * Handles actual DND activation and shows prominent notifications
 */
class DndReceiver : BroadcastReceiver() {
    companion object {
        const val TAG = "DndReceiver"
        const val ACTION_DND_ON = "app.lovable.adhan_zen_95.DND_ON"
        const val ACTION_DND_OFF = "app.lovable.adhan_zen_95.DND_OFF"
        const val EXTRA_PRAYER_NAME = "prayer_name"
        const val DND_CHANNEL_ID = "dnd_status_channel"
        const val NOTIFICATION_ID_DND_ON = 3001
        const val NOTIFICATION_ID_DND_OFF = 3002
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        // Acquire WakeLock immediately to ensure we can process DND
        acquireTempWakeLock(context)
        
        val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: "Prayer"
        
        Log.d(TAG, "╔════════════════════════════════════════╗")
        Log.d(TAG, "║        DND RECEIVER TRIGGERED          ║")
        Log.d(TAG, "╠════════════════════════════════════════╣")
        Log.d(TAG, "║ Action: ${intent.action}")
        Log.d(TAG, "║ Prayer: $prayerName")
        Log.d(TAG, "║ Time: ${java.util.Date()}")
        Log.d(TAG, "║ Has DND permission: ${DndManager.hasPermission(context)}")
        Log.d(TAG, "╚════════════════════════════════════════╝")
        
        // Create notification channel
        createNotificationChannel(context)
        
        when (intent.action) {
            ACTION_DND_ON -> {
                // CRITICAL FIX: Check user settings BEFORE enabling DND
                if (!shouldEnableDndForPrayer(context, prayerName)) {
                    Log.d(TAG, "⏭️ Skipping DND for $prayerName - disabled in user settings")
                    return
                }
                
                Log.d(TAG, "🔇 ========== ENABLING DND FOR $prayerName ==========")
                
                // Play activation sound BEFORE enabling DND (so user hears it)
                DndManager.playStatusSound(context, isActivating = true)
                
                // DndManager uses NotificationManager (proper DND) or AudioManager fallback
                val success = DndManager.enableDnd(context, prayerName)
                
                if (success) {
                    Log.d(TAG, "✅ DND ENABLED successfully for $prayerName")
                    showDndNotification(context, prayerName, true)
                } else {
                    Log.e(TAG, "❌ FAILED to enable DND - no permission and AudioManager failed!")
                    showPermissionNeededNotification(context)
                }
            }
            ACTION_DND_OFF -> {
                Log.d(TAG, "🔔 ========== DISABLING DND FOR $prayerName ==========")
                
                // DndManager.disableDnd returns false if DND was never enabled by the app
                // In that case, we should NOT show the "DND Deactivated" notification
                val wasEnabled = DndManager.disableDnd(context)
                
                if (wasEnabled) {
                    Log.d(TAG, "✅ DND DISABLED successfully - showing notification")
                    showDndNotification(context, prayerName, false)
                    
                    // Play deactivation sound AFTER disabling DND (so phone is unmuted and user hears it)
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        DndManager.playStatusSound(context, isActivating = false)
                    }, 500) // Small delay to ensure phone is unmuted
                } else {
                    Log.d(TAG, "ℹ️ DND was not enabled by app - NOT showing deactivation notification")
                }
            }
            else -> {
                Log.w(TAG, "⚠️ Unknown action: ${intent.action}")
            }
        }
    }
    
    /**
     * Check if DND should be enabled for this prayer based on user settings.
     * Checks both global DND toggle and per-prayer toggle.
     */
    private fun shouldEnableDndForPrayer(context: Context, prayerName: String): Boolean {
        val prefs = context.getSharedPreferences("dnd_user_settings", Context.MODE_PRIVATE)
        
        // Check global DND enabled toggle
        val globalEnabled = prefs.getBoolean("dnd_enabled", true)
        Log.d(TAG, "║ Checking DND settings for $prayerName...")
        Log.d(TAG, "║ Global DND enabled in prefs: $globalEnabled")
        
        if (!globalEnabled) {
            Log.d(TAG, "⚠️ DND globally disabled in settings - SKIPPING DND")
            return false
        }
        
        // Check per-prayer setting
        val prayerType = prayerName.lowercase().let {
            when {
                it.contains("fajr") -> "fajr"
                it.contains("dhuhr") || it.contains("jummah") || it.contains("zuhr") -> "dhuhr"
                it.contains("asr") -> "asr"
                it.contains("maghrib") -> "maghrib"
                it.contains("isha") -> "isha"
                else -> null
            }
        }
        
        if (prayerType != null) {
            val prayerEnabled = prefs.getBoolean("dnd_$prayerType", true)
            Log.d(TAG, "║ Prayer-specific DND ($prayerType) enabled in prefs: $prayerEnabled")
            if (!prayerEnabled) {
                Log.d(TAG, "⚠️ DND disabled for $prayerType in settings - SKIPPING DND")
                return false
            }
        }
        
        Log.d(TAG, "✅ DND enabled for $prayerName in settings - WILL ACTIVATE")
        return true
    }
    
    
    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                DND_CHANNEL_ID,
                "DND Status",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Do Not Disturb status notifications"
                setShowBadge(true)
                enableLights(true)
                enableVibration(true)
            }
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }
    
    private fun showDndNotification(context: Context, prayerName: String, enabled: Boolean) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val pendingIntent = PendingIntent.getActivity(
                context, 0,
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            val title: String
            val text: String
            val icon: Int
            val color: Int
            
            if (enabled) {
                title = "🔇 DND Activated - $prayerName"
                text = "Your phone is now silent for prayer. Will be restored automatically."
                icon = android.R.drawable.ic_lock_silent_mode
                color = 0xFF8B5CF6.toInt() // Purple
            } else {
                title = "🔔 DND Deactivated"
                text = "Prayer time ended. Your phone notifications are restored."
                icon = android.R.drawable.ic_lock_silent_mode_off
                color = 0xFF10B981.toInt() // Green
            }
            
            val notification = NotificationCompat.Builder(context, DND_CHANNEL_ID)
                .setSmallIcon(icon)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setColor(color)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build()
            
            val notificationId = if (enabled) NOTIFICATION_ID_DND_ON else NOTIFICATION_ID_DND_OFF
            nm.notify(notificationId, notification)
            
            Log.d(TAG, "📱 DND notification shown: $title")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show DND notification", e)
        }
    }
    
    private fun showPermissionNeededNotification(context: Context) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Create intent to open DND settings
            val settingsIntent = Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, settingsIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            val notification = NotificationCompat.Builder(context, DND_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("⚠️ DND Permission Required")
                .setContentText("Tap to grant permission for auto-silent during prayer")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setColor(0xFFEF4444.toInt()) // Red
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()
            
            nm.notify(3003, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show permission notification", e)
        }
    }
    
    // Fallback method using AudioManager if DND permission not available
    private fun setRingerSilent(context: Context): Boolean {
        return try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.ringerMode = AudioManager.RINGER_MODE_SILENT
            Log.d(TAG, "✅ AudioManager: Set ringer to SILENT")
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ AudioManager: Failed to set silent", e)
            false
        }
    }
    
    private fun setRingerNormal(context: Context): Boolean {
        return try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.ringerMode = AudioManager.RINGER_MODE_NORMAL
            Log.d(TAG, "✅ AudioManager: Set ringer to NORMAL")
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ AudioManager: Failed to set normal", e)
            false
        }
    }

    private fun acquireTempWakeLock(context: Context) {
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            val wl = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "AdhanZen:DndReceiver")
            wl.acquire(5000) // 5 seconds sufficient to toggle DND
            Log.d(TAG, "⚡ Acquired temp WakeLock for DndReceiver")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire temp WakeLock", e)
        }
    }
}
