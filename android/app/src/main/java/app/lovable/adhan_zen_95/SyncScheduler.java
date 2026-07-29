package app.lovable.adhan_zen_95;

import android.content.Context;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

/**
 * Enqueues the daily PrayerSyncWorker. Idempotent — safe to call every app open,
 * boot receiver, and after user selects a new mosque.
 */
public class SyncScheduler {
    public static final String PERIODIC_NAME = "prayer_daily_sync";
    public static final String ONE_TIME_NAME = "prayer_one_time_sync";

    public static void enqueueDaily(Context ctx) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        // Every 12h with the flex window at the end — WorkManager fires once per period.
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(
                PrayerSyncWorker.class, 12, TimeUnit.HOURS, 2, TimeUnit.HOURS)
                .setConstraints(constraints)
                .setInitialDelay(15, TimeUnit.MINUTES)
                .build();

        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
                PERIODIC_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                req
        );
    }

    /** Kick a fresh sync immediately (e.g. when the user changes their selected mosque). */
    public static void runOnce(Context ctx) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(PrayerSyncWorker.class)
                .setConstraints(constraints)
                .build();
        WorkManager.getInstance(ctx).enqueueUniqueWork(
                ONE_TIME_NAME,
                ExistingWorkPolicy.REPLACE,
                req
        );
    }

    public static void cancel(Context ctx) {
        WorkManager.getInstance(ctx).cancelUniqueWork(PERIODIC_NAME);
        WorkManager.getInstance(ctx).cancelUniqueWork(ONE_TIME_NAME);
    }
}
