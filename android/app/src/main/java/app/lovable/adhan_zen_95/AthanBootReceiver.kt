package app.lovable.adhan_zen_95

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

class AthanBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
            Log.d("AthanBootReceiver", "📱 Device booted - rescheduling all alarms")
            try {
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
                Log.d("AthanBootReceiver", "🔄 Rescheduling adhan alarms...")
                ReliableAlarmScheduler.rescheduleStoredAlarms(context)
                
                // Reschedule DND alarms
                Log.d("AthanBootReceiver", "🔇 Rescheduling DND alarms...")
                DndScheduler.rescheduleStoredDndAlarms(context)
                
                // Schedule daily update
                AdhanDailyUpdateReceiver.scheduleDailyUpdate(context)
                
                // Start the countdown notification service
                Log.d("AthanBootReceiver", "📊 Starting countdown service...")
                try {
                    val serviceIntent = Intent(context, PrayerCountdownService::class.java).apply {
                        action = PrayerCountdownService.ACTION_START
                    }
                    ContextCompat.startForegroundService(context, serviceIntent)
                } catch (e: Exception) {
                    Log.e("AthanBootReceiver", "Failed to start countdown service", e)
                }
                
                // Background fetch for updated prayer times
                Thread { PrayerTimeFetcher.fetchAndUpdatePrayerTimes(context) }.start()
                
                Log.d("AthanBootReceiver", "✅ Boot recovery complete")
            } catch (e: Exception) {
                Log.e("AthanBootReceiver", "❌ Boot recovery failed", e)
            }
        }
    }
}

