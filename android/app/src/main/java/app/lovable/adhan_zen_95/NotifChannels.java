package app.lovable.adhan_zen_95;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

public class NotifChannels {
    public static final String CHANNEL_ADHAN = "adhan_channel";

    public static void ensure(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (nm.getNotificationChannel(CHANNEL_ADHAN) != null) return;

        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ADHAN,
                "Adhan / Prayer Alerts",
                NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Alerts at Adhan and Iqamah times");
        ch.enableLights(true);
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 500, 250, 500});

        Uri sound = Uri.parse("android.resource://" + ctx.getPackageName() + "/raw/azan1");
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();
        ch.setSound(sound, attrs);
        nm.createNotificationChannel(ch);
    }
}
