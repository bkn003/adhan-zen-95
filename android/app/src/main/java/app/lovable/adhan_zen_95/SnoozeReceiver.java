package app.lovable.adhan_zen_95;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * "Snooze" action on an adhan/iqamah notification: clears the notification and
 * rings the same prayer again after the user's snooze delay (default 5 minutes).
 */
public class SnoozeReceiver extends BroadcastReceiver {
    static final String KEY_SNOOZE_MINUTES = "snooze_minutes";
    static final String KEY_ALARM_VOLUME = "alarm_volume";

    public static int snoozeMinutes(Context ctx) {
        int m = AlarmScheduler.prefs(ctx).getInt(KEY_SNOOZE_MINUTES, 5);
        return (m >= 1 && m <= 60) ? m : 5;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String prayerName = intent.getStringExtra("prayerName");
        String phase = intent.getStringExtra("phase");
        String adhan = intent.getStringExtra("adhan");
        String iqamah = intent.getStringExtra("iqamah");
        String type = intent.getStringExtra("type");
        int notifId = intent.getIntExtra("notifId", 0);
        if (prayerName == null) prayerName = "Prayer";
        if (phase == null) phase = "adhan";

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && notifId != 0) nm.cancel(notifId);

        long trigger = System.currentTimeMillis() + snoozeMinutes(context) * 60L * 1000L;
        AlarmScheduler.scheduleAt(context, prayerName, phase, adhan, iqamah, type, trigger);
    }
}
