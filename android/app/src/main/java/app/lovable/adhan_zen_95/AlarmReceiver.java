package app.lovable.adhan_zen_95;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

/**
 * Fires when AlarmManager triggers a prayer alarm.
 * - Posts a high-importance notification with adhan sound
 * - Re-schedules the SAME prayer/phase for +24h so alarms continue indefinitely
 *   even if the user never re-opens the app.
 */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        NotifChannels.ensure(context);

        String prayerName = intent.getStringExtra("prayerName");
        String phase = intent.getStringExtra("phase");
        String adhan = intent.getStringExtra("adhan");
        String iqamah = intent.getStringExtra("iqamah");
        String type = intent.getStringExtra("type");
        if (prayerName == null) prayerName = "Prayer";
        if (phase == null) phase = "adhan";

        String title = "adhan".equals(phase)
                ? prayerName + " Adhan"
                : prayerName + " Iqamah";
        String body = "adhan".equals(phase)
                ? "It's time for " + prayerName + " prayer"
                : prayerName + " Iqamah is now";

        // Launch app when notification tapped
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentPi = null;
        if (open != null) {
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            contentPi = PendingIntent.getActivity(context, 0, open, flags);
        }

        Uri sound = Uri.parse("android.resource://" + context.getPackageName() + "/raw/azan1");

        NotificationCompat.Builder b = new NotificationCompat.Builder(context, NotifChannels.CHANNEL_ADHAN)
                .setSmallIcon(context.getResources().getIdentifier("ic_stat_name", "drawable", context.getPackageName()) != 0
                        ? context.getResources().getIdentifier("ic_stat_name", "drawable", context.getPackageName())
                        : android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setVibrate(new long[]{0, 500, 250, 500})
                .setSound(sound, AudioAttributes.USAGE_ALARM);
        if (contentPi != null) b.setContentIntent(contentPi);

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        int notifId = ("notif_" + prayerName + "_" + phase).hashCode();
        if (nm != null) nm.notify(notifId, b.build());

        // === Self-perpetuation: re-schedule the SAME slot for +24h ===
        // Ensures unlimited-day reliability even if the app is never opened again.
        long nextTrigger = System.currentTimeMillis() + 24L * 60L * 60L * 1000L;
        AlarmScheduler.scheduleAt(context, prayerName, phase, adhan, iqamah, type, nextTrigger);
    
        // Keep widget + lock-screen countdown in sync with the new "next prayer"
        try { PrayerWidgetProvider.refresh(context); } catch (Exception ignored) {}
}
}
