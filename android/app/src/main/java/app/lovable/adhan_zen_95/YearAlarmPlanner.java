package app.lovable.adhan_zen_95;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Keeps a rolling window of exact alarms armed from a persisted YEAR of prayer
 * timings, so Adhan/Iqamah alarms keep firing for years with no internet and
 * without the app ever being opened again.
 *
 * Stored shape (SharedPreferences key "year_schedule"):
 * {"savedAt":123,"days":{"2026-09-09":[{"name":"Fajr","adhan":"05:10","iqamah":"05:30","type":"fajr"}]}}
 */
public class YearAlarmPlanner {
    static final String KEY_YEAR = "year_schedule";
    private static final String KEY_WINDOW_IDS = "year_alarm_ids";
    /** Days of alarms kept armed ahead of now (5 prayers x 2 phases x 30 = 300 alarms). */
    public static final int WINDOW_DAYS = 30;

    private static final SimpleDateFormat DAY =
            new SimpleDateFormat("yyyy-MM-dd", Locale.US);

    public static boolean hasYearData(Context ctx) {
        String raw = AlarmScheduler.prefs(ctx).getString(KEY_YEAR, null);
        if (raw == null) return false;
        try {
            JSONObject root = new JSONObject(raw);
            JSONObject days = root.optJSONObject("days");
            return days != null && days.length() > 0;
        } catch (Exception e) {
            return false;
        }
    }

    public static void saveYear(Context ctx, JSONObject payload) {
        AlarmScheduler.prefs(ctx).edit().putString(KEY_YEAR, payload.toString()).apply();
    }

    public static int storedDayCount(Context ctx) {
        try {
            JSONObject root = new JSONObject(AlarmScheduler.prefs(ctx).getString(KEY_YEAR, "{}"));
            JSONObject days = root.optJSONObject("days");
            return days == null ? 0 : days.length();
        } catch (Exception e) {
            return 0;
        }
    }

    public static long savedAt(Context ctx) {
        try {
            JSONObject root = new JSONObject(AlarmScheduler.prefs(ctx).getString(KEY_YEAR, "{}"));
            return root.optLong("savedAt", 0L);
        } catch (Exception e) {
            return 0L;
        }
    }

    private static int windowAlarmId(String dayISO, String prayerName, String phase) {
        return ("y_" + dayISO + "_" + prayerName + "_" + phase).hashCode();
    }

    private static PendingIntent pending(Context ctx, int id, String prayerName, String phase,
                                         String adhan, String iqamah, String type) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.setAction("app.lovable.adhan_zen_95.ALARM_" + id);
        i.putExtra("prayerName", prayerName);
        i.putExtra("phase", phase);
        i.putExtra("adhan", adhan);
        i.putExtra("iqamah", iqamah);
        i.putExtra("type", type);
        i.putExtra("fromYear", true);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, id, i, flags);
    }

    /**
     * (Re)arm every enabled Adhan/Iqamah alarm falling inside the next WINDOW_DAYS days.
     * Safe to call repeatedly — ids are deterministic so alarms update in place.
     *
     * @return number of alarms armed
     */
    public static int refillWindow(Context ctx) {
        if (!hasYearData(ctx)) return 0;
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return 0;

        JSONObject days;
        try {
            days = new JSONObject(AlarmScheduler.prefs(ctx).getString(KEY_YEAR, "{}")).optJSONObject("days");
        } catch (Exception e) {
            return 0;
        }
        if (days == null) return 0;

        long now = System.currentTimeMillis();
        Set<String> ids = new HashSet<>();
        int armed = 0;

        Calendar cursor = Calendar.getInstance();
        for (int d = 0; d < WINDOW_DAYS; d++) {
            Calendar day = (Calendar) cursor.clone();
            day.add(Calendar.DAY_OF_MONTH, d);
            String key = DAY.format(day.getTime());
            JSONArray prayers = days.optJSONArray(key);
            if (prayers == null) continue;

            for (int i = 0; i < prayers.length(); i++) {
                JSONObject p = prayers.optJSONObject(i);
                if (p == null) continue;
                String name = p.optString("name", "Prayer");
                String type = p.optString("type", "");
                String adhan = p.optString("adhan", "");
                String iqamah = p.optString("iqamah", "");

                armed += armSlot(ctx, am, day, key, name, "adhan", adhan, adhan, iqamah, type, now, ids);
                armed += armSlot(ctx, am, day, key, name, "iqamah", iqamah, adhan, iqamah, type, now, ids);
            }
        }

        AlarmScheduler.prefs(ctx).edit().putStringSet(KEY_WINDOW_IDS, ids).apply();
        return armed;
    }

    private static int armSlot(Context ctx, AlarmManager am, Calendar day, String dayISO,
                               String name, String phase, String time,
                               String adhan, String iqamah, String type,
                               long now, Set<String> ids) {
        if (time == null || time.isEmpty()) return 0;
        if (!AlarmScheduler.isPhaseEnabled(ctx, type, phase)) return 0;
        Calendar when = AlarmScheduler.parseTime(time, day, false);
        if (when == null || when.getTimeInMillis() <= now) return 0;
        int id = windowAlarmId(dayISO, name, phase);
        AlarmScheduler.setExactPublic(am, when.getTimeInMillis(),
                pending(ctx, id, name, phase, adhan, iqamah, type));
        ids.add(String.valueOf(id));
        return 1;
    }

    /** Cancel every alarm armed from the year window. */
    public static void cancelWindow(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Set<String> ids = AlarmScheduler.prefs(ctx).getStringSet(KEY_WINDOW_IDS, new HashSet<>());
        for (String s : ids) {
            try {
                int id = Integer.parseInt(s);
                Intent i = new Intent(ctx, AlarmReceiver.class);
                i.setAction("app.lovable.adhan_zen_95.ALARM_" + id);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                am.cancel(PendingIntent.getBroadcast(ctx, id, i, flags));
            } catch (Exception ignored) {}
        }
        AlarmScheduler.prefs(ctx).edit().remove(KEY_WINDOW_IDS).apply();
    }
}
