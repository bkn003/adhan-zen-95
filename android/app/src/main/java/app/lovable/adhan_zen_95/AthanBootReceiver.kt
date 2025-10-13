package app.lovable.adhan_zen_95

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class AthanBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || 
            intent.action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
            
            Log.d("AthanBootReceiver", "Device booted - recreating Adhan notification channel")
            
            // Recreate the notification channel after boot
            try {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
                
                val channel = android.app.NotificationChannel(
                    "adhan_channel",
                    "Adhan",
                    android.app.NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Prayer time Adhan alerts"
                    setShowBadge(true)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                    enableVibration(true)
                    enableLights(true)
                    
                    // Set custom sound
                    val soundUri = android.net.Uri.parse("android.resource://${context.packageName}/raw/azan1")
                    setSound(soundUri, android.media.AudioAttributes.Builder()
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                        .build())
                }
                
                notificationManager.createNotificationChannel(channel)
                Log.d("AthanBootReceiver", "Adhan channel recreated successfully")
                
            } catch (e: Exception) {
                Log.e("AthanBootReceiver", "Failed to recreate channel", e)
            }
        }
    }
}
