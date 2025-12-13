package app.lovable.adhan_zen_95

import android.app.ActivityManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * BroadcastReceiver that triggers when the screen turns on.
 * This is a CRITICAL fallback for aggressive OEMs that kill all pending alarms
 * when user kills all apps.
 * 
 * When user turns on the screen, we check if the countdown service is running
 * and restart it if not.
 */
class ScreenOnReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "ScreenOnReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_SCREEN_ON || 
            intent.action == Intent.ACTION_USER_PRESENT) {
            Log.d(TAG, "📱 Screen turned on - checking if countdown service is running...")
            
            // Check if the service is running
            if (!isServiceRunning(context, PrayerCountdownService::class.java)) {
                Log.d(TAG, "⚠️ Countdown service NOT running - restarting...")
                restartService(context)
            } else {
                Log.d(TAG, "✅ Countdown service is already running")
            }
        }
    }
    
    private fun isServiceRunning(context: Context, serviceClass: Class<*>): Boolean {
        val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        @Suppress("DEPRECATION")
        for (service in manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.name == service.service.className) {
                return true
            }
        }
        return false
    }
    
    private fun restartService(context: Context) {
        try {
            val serviceIntent = Intent(context, PrayerCountdownService::class.java).apply {
                action = PrayerCountdownService.ACTION_START
            }
            ContextCompat.startForegroundService(context, serviceIntent)
            Log.d(TAG, "✅ PrayerCountdownService restarted on screen on")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to restart service on screen on", e)
            
            // Fallback to WorkManager
            try {
                ServiceRestartWorker.triggerImmediateRestart(context)
            } catch (e2: Exception) {
                Log.e(TAG, "❌ WorkManager fallback also failed", e2)
            }
        }
    }
}
