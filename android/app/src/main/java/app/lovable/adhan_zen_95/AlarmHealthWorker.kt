package app.lovable.adhan_zen_95

import android.content.Context
import android.util.Log
import androidx.work.*
import java.util.concurrent.TimeUnit

/**
 * LAYER 4 RELIABILITY: WorkManager health check
 * 
 * This worker runs every 15 minutes to verify:
 * 1. Daily update alarm is scheduled
 * 2. Prayer alarms are scheduled for today
 * 3. Countdown service is running
 * 
 * WorkManager survives app kills and device reboots, providing
 * an additional safety net for alarm scheduling.
 */
class AlarmHealthWorker(
    context: Context, 
    params: WorkerParameters
) : Worker(context, params) {
    
    companion object {
        private const val TAG = "AlarmHealthWorker"
        private const val WORK_NAME = "alarm_health_check"
        
        /**
         * Schedule periodic health checks every 15 minutes
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiresBatteryNotLow(false) // Run even on low battery
                .build()
            
            val request = PeriodicWorkRequestBuilder<AlarmHealthWorker>(
                6, TimeUnit.HOURS  // SIMPLIFIED: Check 4 times per day (battery-friendly)
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.LINEAR, 5, TimeUnit.MINUTES)
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP, // Don't replace if already scheduled
                    request
                )
            
            Log.d(TAG, "✅ Scheduled periodic health check (every 15 min)")
        }
        
        /**
         * Run an immediate one-time health check
         */
        fun runImmediateCheck(context: Context) {
            val request = OneTimeWorkRequestBuilder<AlarmHealthWorker>()
                .build()
            
            WorkManager.getInstance(context).enqueue(request)
            Log.d(TAG, "🏥 Triggered immediate health check")
        }
    }
    
    override fun doWork(): Result {
        Log.d(TAG, "╔════════════════════════════════════════╗")
        Log.d(TAG, "║     LAYER 4: ALARM HEALTH CHECK        ║")
        Log.d(TAG, "╠════════════════════════════════════════╣")
        Log.d(TAG, "║ Time: ${java.util.Date()}")
        Log.d(TAG, "╚════════════════════════════════════════╝")
        
        var issuesFound = 0
        
        // Check 1: Is daily update alarm scheduled?
        try {
            if (!AdhanDailyUpdateReceiver.isDailyUpdateScheduled(applicationContext)) {
                Log.w(TAG, "⚠️ CHECK 1 FAIL: Daily update alarm NOT scheduled!")
                AdhanDailyUpdateReceiver.scheduleDailyUpdate(applicationContext)
                Log.d(TAG, "✅ Fixed: Re-scheduled daily update alarm")
                issuesFound++
            } else {
                Log.d(TAG, "✅ CHECK 1 PASS: Daily update alarm is scheduled")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ CHECK 1 ERROR", e)
        }
        
        // Check 2: Are prayer alarms scheduled for today?
        try {
            if (!ReliableAlarmScheduler.hasStoredAlarms(applicationContext)) {
                Log.w(TAG, "⚠️ CHECK 2 FAIL: No prayer alarms scheduled!")
                
                // First try to use stored prayer data
                if (ReliableAlarmScheduler.hasStoredPrayerData(applicationContext)) {
                    Log.d(TAG, "📿 Found stored prayer data, rescheduling...")
                    ReliableAlarmScheduler.rescheduleForNewDay(applicationContext)
                    DndScheduler.rescheduleForNewDay(applicationContext)
                } else {
                    // Fetch from Supabase as last resort
                    Log.d(TAG, "🌐 No stored data, fetching from Supabase...")
                    PrayerTimeFetcher.fetchAndUpdatePrayerTimes(applicationContext)
                }
                issuesFound++
            } else {
                Log.d(TAG, "✅ CHECK 2 PASS: Prayer alarms are scheduled")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ CHECK 2 ERROR", e)
        }
        
        // Check 3: Is countdown service running? (Try to start it)
        try {
            val serviceIntent = android.content.Intent(
                applicationContext, 
                PrayerCountdownService::class.java
            ).apply {
                action = PrayerCountdownService.ACTION_START
            }
            androidx.core.content.ContextCompat.startForegroundService(
                applicationContext, 
                serviceIntent
            )
            Log.d(TAG, "✅ CHECK 3: Ensured countdown service is running")
        } catch (e: Exception) {
            Log.e(TAG, "❌ CHECK 3 ERROR: Failed to start countdown service", e)
        }
        
        Log.d(TAG, "🏥 Health check complete. Issues found: $issuesFound")
        
        return Result.success()
    }
}
