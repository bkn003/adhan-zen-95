package app.lovable.adhan_zen_95

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

class AthanBootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AthanBootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        
        when (action) {
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_LOCKED_BOOT_COMPLETED -> {
                Log.d(TAG, "📱 Device booted - rescheduling all alarms")
                handleFullReschedule(context, "boot")
            }
            Intent.ACTION_TIME_CHANGED -> {
                Log.d(TAG, "⏰ System time changed - rescheduling all alarms")
                handleFullReschedule(context, "time_changed")
            }
            Intent.ACTION_TIMEZONE_CHANGED -> {
                Log.d(TAG, "🌍 Timezone changed - rescheduling all alarms")
                handleFullReschedule(context, "timezone_changed")
            }
            else -> {
                Log.w(TAG, "Unknown action: $action")
            }
        }
    }
    
    private fun handleFullReschedule(context: Context, reason: String) {
        try {
            Log.d(TAG, "╔════════════════════════════════════════╗")
            Log.d(TAG, "║      FULL ALARM RESCHEDULE             ║")
            Log.d(TAG, "╠════════════════════════════════════════╣")
            Log.d(TAG, "║ Reason: $reason")
            Log.d(TAG, "║ Time: ${java.util.Date()}")
            Log.d(TAG, "╚════════════════════════════════════════╝")
            
            // Create notification channel for Adhan
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            val channel = android.app.NotificationChannel("adhan_channel", "Adhan", android.app.NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Prayer time alerts"
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableVibration(true)
                val soundUri = android.net.Uri.parse("android.resource://${context.packageName}/raw/adhan")
                setSound(soundUri, android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build())
            }
            nm.createNotificationChannel(channel)
            
            // Reschedule all alarms
            Log.d(TAG, "🔄 Rescheduling adhan alarms...")
            ReliableAlarmScheduler.rescheduleStoredAlarms(context)
            
            // Reschedule DND alarms
            Log.d(TAG, "🔇 Rescheduling DND alarms...")
            DndScheduler.rescheduleStoredDndAlarms(context)
            
            // Schedule daily update
            AdhanDailyUpdateReceiver.scheduleDailyUpdate(context)
            
            // Start the countdown notification service
            Log.d(TAG, "📊 Starting countdown service...")
            try {
                val serviceIntent = Intent(context, PrayerCountdownService::class.java).apply {
                    action = PrayerCountdownService.ACTION_START
                }
                ContextCompat.startForegroundService(context, serviceIntent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start countdown service", e)
            }
            
            // Background fetch for updated prayer times
            Thread { 
                PrayerTimeFetcher.fetchAndUpdatePrayerTimes(context)
                
                // Schedule prayer change notification check
                PrayerChangeReceiver.scheduleFromStoredData(context)
                
                // Pre-cache upcoming prayer data for offline use
                PrayerChangeNotifier.preCacheUpcomingData(context)
            }.start()
            
            Log.d(TAG, "✅ Full reschedule complete (reason: $reason)")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Full reschedule failed", e)
        }
    }
}

