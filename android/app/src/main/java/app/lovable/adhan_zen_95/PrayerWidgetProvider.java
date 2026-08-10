package app.lovable.adhan_zen_95;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * Home-screen widget showing the next prayer + countdown.
 * Reads the same persisted "today_prayers" JSON that AlarmScheduler uses, so it
 * keeps working with the app fully closed and after reboot.
 */
public class PrayerWidgetProvider extends AppWidgetProvider {

    private static final String PREFS = "AdhanNativePrefs";
    private static final String KEY_TODAY_PRAYERS = "today_prayers";
    private static final String KEY_MOSQUE_NAME = "mosque_name";

    public static class Next {
        public String name = "—";
        public String adhan = "--:--";
        public String iqamah = "";
        public long triggerAtMs = 0;
    }

    private static int minutesOf(String hhmm) {
        try {
            String[] p = hhmm.split(":");
            return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
        } catch (Exception e) {
            return -1;
        }
    }

    private static String to12h(String hhmm) {
        int m = minutesOf(hhmm);
        if (m < 0) return "--:--";
        int h = m / 60, mm = m % 60;
        String suffix = h >= 12 ? "PM" : "AM";
        int h12 = h % 12 == 0 ? 12 : h % 12;
        return String.format(Locale.US, "%d:%02d %s", h12, mm, suffix);
    }

    /** Finds the next upcoming prayer from persisted today's schedule. */
    public static Next findNext(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = p.getString(KEY_TODAY_PRAYERS, null);
        if (raw == null) return null;
        Calendar now = Calendar.getInstance();
        int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        Next best = null;
        int bestMin = Integer.MAX_VALUE;
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                String type = o.optString("type", "");
                if (!type.matches("fajr|dhuhr|asr|maghrib|isha|jummah")) continue;
                String adhan = o.optString("adhan", "");
                int m = minutesOf(adhan);
                if (m < 0 || m <= nowMin || m >= bestMin) continue;
                bestMin = m;
                best = new Next();
                best.name = o.optString("name", type);
                best.adhan = adhan;
                best.iqamah = o.optString("iqamah", "");
                Calendar c = Calendar.getInstance();
                c.set(Calendar.HOUR_OF_DAY, m / 60);
                c.set(Calendar.MINUTE, m % 60);
                c.set(Calendar.SECOND, 0);
                best.triggerAtMs = c.getTimeInMillis();
            }
        } catch (Exception ignored) {}
        return best;
    }

    /** Refreshes every widget instance and the lock-screen live activity. */
    public static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        ComponentName cn = new ComponentName(ctx, PrayerWidgetProvider.class);
        int[] ids = mgr.getAppWidgetIds(cn);
        for (int id : ids) render(ctx, mgr, id);
        LiveActivityNotifier.update(ctx);
    }

    private static void render(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_prayer);
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String mosque = p.getString(KEY_MOSQUE_NAME, "Your Mosque");

        Next next = findNext(ctx);
        views.setTextViewText(R.id.widget_mosque, mosque);
        if (next == null) {
            views.setTextViewText(R.id.widget_prayer_name, "No schedule");
            views.setTextViewText(R.id.widget_prayer_time, "--:--");
            views.setTextViewText(R.id.widget_iqamah, "Open the app to sync");
            views.setChronometerCountDown(R.id.widget_countdown, false);
            views.setTextViewText(R.id.widget_countdown, "");
        } else {
            views.setTextViewText(R.id.widget_prayer_name, next.name);
            views.setTextViewText(R.id.widget_prayer_time, to12h(next.adhan));
            views.setTextViewText(R.id.widget_iqamah,
                    next.iqamah.isEmpty() ? "" : "Jamaat " + to12h(next.iqamah));
            long base = android.os.SystemClock.elapsedRealtime()
                    + (next.triggerAtMs - System.currentTimeMillis());
            views.setChronometer(R.id.widget_countdown, base, null, true);
            views.setChronometerCountDown(R.id.widget_countdown, true);
        }

        Intent open = new Intent(ctx, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        views.setOnClickPendingIntent(R.id.widget_root,
                PendingIntent.getActivity(ctx, 0, open, flags));

        mgr.updateAppWidget(widgetId, views);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] widgetIds) {
        for (int id : widgetIds) render(ctx, mgr, id);
        LiveActivityNotifier.update(ctx);
    }

    @Override
    public void onEnabled(Context ctx) {
        LiveActivityNotifier.update(ctx);
    }

    public static String todayString() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new java.util.Date());
    }
}
