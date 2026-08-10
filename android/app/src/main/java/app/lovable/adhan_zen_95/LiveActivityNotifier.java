package app.lovable.adhan_zen_95;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

/**
 * Lock-screen "live activity" parity: a persistent, silent notification with a
 * live countdown chronometer to the next prayer. Visible on the lock screen and
 * mirrored to Wear OS (bridged notifications), so alerts show even when the app
 * is closed.
 */
public class LiveActivityNotifier {

    private static final String PREFS = "AdhanNativePrefs";
    private static final String KEY_MOSQUE_NAME = "mosque_name";
    private static final String KEY_LIVE_ENABLED = "live_activity_enabled";
    public static final int NOTIF_ID = 90210;

    public static void setEnabled(Context ctx, boolean enabled) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putBoolean(KEY_LIVE_ENABLED, enabled).apply();
        if (enabled) update(ctx); else cancel(ctx);
    }

    public static boolean isEnabled(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(KEY_LIVE_ENABLED, true);
    }

    public static void cancel(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NOTIF_ID);
    }

    public static void update(Context ctx) {
        if (!isEnabled(ctx)) { cancel(ctx); return; }
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotifChannels.ensure(ctx);

        PrayerWidgetProvider.Next next = PrayerWidgetProvider.findNext(ctx);
        if (next == null) { cancel(ctx); return; }

        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String mosque = p.getString(KEY_MOSQUE_NAME, "Your Mosque");

        Intent open = new Intent(ctx, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(ctx, 1, open, flags);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, NotifChannels.CHANNEL_SILENT)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Next: " + next.name)
                .setContentText(mosque + (next.iqamah.isEmpty() ? "" : " · Jamaat " + next.iqamah))
                .setSubText("Prayer countdown")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(true)
                .setWhen(next.triggerAtMs)
                .setUsesChronometer(true)
                .setContentIntent(pi)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setLocalOnly(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            b.setChronometerCountDown(true);
        }

        Notification n = b.build();
        n.flags |= Notification.FLAG_NO_CLEAR;
        nm.notify(NOTIF_ID, n);
    }
}
