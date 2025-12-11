package app.lovable.adhan_zen_95

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.*
import java.util.concurrent.TimeUnit

/**
 * Worker that ensures the PrayerCountdownService is running.
 * This is scheduled to run periodically and also triggered when app is killed.
 */
class ServiceRestartWorker(
    context: Context,
    workerParams: WorkerParameters
) : Worker(context, workerParams) {
    
    companion object {
        private const val TAG = "ServiceRestartWorker"
        private const val WORK_NAME = "prayer_countdown_restart"
        
        /**
         * Schedule periodic work to ensure service is running
         */
        fun schedulePeriodicRestart(context: Context) {
            try {
                val constraints = Constraints.Builder()
                    .setRequiresBatteryNotLow(false)
                    .setRequiresCharging(false)
                    .build()
                
                // Run every 15 minutes (minimum allowed by WorkManager)
                val periodicWork = PeriodicWorkRequestBuilder<ServiceRestartWorker>(
                    15, TimeUnit.MINUTES
                )
                    .setConstraints(constraints)
                    .setBackoffCriteria(
                        BackoffPolicy.LINEAR,
                        WorkRequest.MIN_BACKOFF_MILLIS,
                        TimeUnit.MILLISECONDS
                    )
                    .build()
                
                WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    periodicWork
                )
                
                Log.d(TAG, "✅ Scheduled periodic service restart every 15 minutes")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to schedule periodic restart", e)
            }
        }
        
        /**
         * Immediately trigger a one-time restart
         */
        fun triggerImmediateRestart(context: Context) {
            try {
                val oneTimeWork = OneTimeWorkRequestBuilder<ServiceRestartWorker>()
                    .setInitialDelay(500, TimeUnit.MILLISECONDS) // Small delay
                    .build()
                
                WorkManager.getInstance(context).enqueue(oneTimeWork)
                Log.d(TAG, "✅ Triggered immediate service restart")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to trigger immediate restart", e)
            }
        }
    }
    
    override fun doWork(): Result {
        Log.d(TAG, "🔄 ServiceRestartWorker executing...")
        
        return try {
            // Start the countdown service
            val serviceIntent = Intent(applicationContext, PrayerCountdownService::class.java).apply {
                action = PrayerCountdownService.ACTION_START
            }
            
            ContextCompat.startForegroundService(applicationContext, serviceIntent)
            Log.d(TAG, "✅ PrayerCountdownService started from Worker")
            
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start service from Worker", e)
            Result.retry()
        }
    }
}
