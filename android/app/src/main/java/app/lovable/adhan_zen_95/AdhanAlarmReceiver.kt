package app.lovable.adhan_zen_95

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Receives exact alarms and starts the foreground service to play Adhan audio
 */
class AdhanAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        try {
            val prayerName = intent.getStringExtra(AdhanForegroundService.EXTRA_PRAYER_NAME) ?: "Prayer"
            val serviceIntent = Intent(context, AdhanForegroundService::class.java).apply {
                action = AdhanForegroundService.ACTION_PLAY_ADHAN
                putExtra(AdhanForegroundService.EXTRA_PRAYER_NAME, prayerName)
            }
            ContextCompat.startForegroundService(context, serviceIntent)
            Log.d("AdhanAlarmReceiver", "Started AdhanForegroundService for $prayerName")
        } catch (e: Exception) {
            Log.e("AdhanAlarmReceiver", "Failed to start foreground service", e)
        }
    }
}