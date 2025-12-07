package app.lovable.adhan_zen_95

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class DndReceiver : BroadcastReceiver() {
    companion object {
        const val TAG = "DndReceiver"
        const val ACTION_DND_ON = "app.lovable.adhan_zen_95.DND_ON"
        const val ACTION_DND_OFF = "app.lovable.adhan_zen_95.DND_OFF"
        const val EXTRA_PRAYER_NAME = "prayer_name"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: "Prayer"
        
        Log.d(TAG, "=== DND RECEIVER TRIGGERED ===")
        Log.d(TAG, "Action: ${intent.action}")
        Log.d(TAG, "Prayer: $prayerName")
        Log.d(TAG, "Time: ${java.util.Date()}")
        Log.d(TAG, "Has DND permission: ${DndManager.hasPermission(context)}")
        
        when (intent.action) {
            ACTION_DND_ON -> {
                Log.d(TAG, "🔇 Attempting to ENABLE DND for $prayerName")
                val success = DndManager.enableDnd(context, prayerName)
                Log.d(TAG, "DND enable result: ${if (success) "✅ SUCCESS" else "❌ FAILED"}")
                if (success) {
                    showNotification(context, prayerName, true)
                }
            }
            ACTION_DND_OFF -> {
                Log.d(TAG, "🔔 Attempting to DISABLE DND for $prayerName")
                val success = DndManager.disableDnd(context)
                Log.d(TAG, "DND disable result: ${if (success) "✅ SUCCESS" else "❌ FAILED"}")
                if (success) {
                    showNotification(context, prayerName, false)
                }
            }
            else -> {
                Log.w(TAG, "⚠️ Unknown action: ${intent.action}")
            }
        }
    }
    
    private fun showNotification(context: Context, prayerName: String, enabled: Boolean) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                nm.createNotificationChannel(android.app.NotificationChannel("dnd_status", "DND Status", android.app.NotificationManager.IMPORTANCE_LOW))
            }
            val title = if (enabled) "🔇 DND Enabled" else "🔔 DND Disabled"
            val text = if (enabled) "$prayerName - DND active" else "Notifications restored"
            val n = androidx.core.app.NotificationCompat.Builder(context, "dnd_status")
                .setSmallIcon(android.R.drawable.ic_lock_silent_mode)
                .setContentTitle(title).setContentText(text)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
                .setAutoCancel(true).build()
            nm.notify(if (enabled) 2001 else 2002, n)
        } catch (e: Exception) {
            Log.e("DndReceiver", "Notification failed", e)
        }
    }
}
