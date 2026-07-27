package app.lovable.adhan_zen_95;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Shared logic to schedule / cancel reliable AlarmManager alarms for prayer times.
 * Called by AdhanNativePlugin (from JS), AlarmReceiver (self-perpetuation),
 * and BootReceiver (after reboot / app upgrade).
 */
public class AlarmScheduler {
    private static final String PREFS = "AdhanNativePrefs";
    private static final String KEY_TODAY_PRAYERS = "today_prayers";
    private static final String KEY_ALARM_IDS = "scheduled_alarm_ids";

    public static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Parses "HH:mm" or "hh:mm AM/PM" -> Calendar today (or tomorrow if already passed and rollForward=true). */
    public static Calendar parseTime(String time, Calendar base, boolean rollForward) {
        Calendar c = (Calendar) base.clone();
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        int h = 0, m = 0;
        try {
            String t = time.trim();
            if (t.toLowerCase(Locale.US).matches(".*(am|pm).*")) {
                String[] parts = t.split("\\s+");
                String[] hm = parts[0].split(":");
                h = Integer.parseInt(hm[0]) % 12;
                m = Integer.parseInt(hm[1]);
                if (parts[1].toLowerCase(Locale.US).startsWith("p")) h += 12;
            } else {
                String[] hm = t.split(":");
                h = Integer.parseInt(hm[0]);
                m = Integer.parseInt(hm[1]);
            }
        } catch (Exception e) {
            return null;
        }
        c.set(Calendar.HOUR_OF_DAY, h);
        c.set(Calendar.MINUTE, m);
        if (rollForward && c.getTimeInMillis() <= System.currentTimeMillis()) {
            c.add(Calendar.DAY_OF_MONTH, 1);
        }
        return c;
    }

    /** Deterministic per-prayer alarm id so same slot updates instead of duplicating. */
    public static int alarmId(String prayerName, String phase) {
        return ("prayer_" + prayerName + "_" + phase).hashCode();
    }

    private static PendingIntent buildPending(Context ctx, int id, String prayerName, String phase, String adhan, String iqamah, String type) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.setAction("app.lovable.adhan_zen_95.ALARM_" + id);
        i.putExtra("prayerName", prayerName);
        i.putExtra("phase", phase);
        i.putExtra("adhan", adhan);
        i.putExtra("iqamah", iqamah);
        i.putExtra("type", type);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, id, i, flags);
    }

    /**
     * Schedule adhan + iqamah alarms for one prayer, rolling to the next day if already passed.
     * Returns the number of alarms scheduled (0-2).
     */
    public static int scheduleOne(Context ctx, String prayerName, String adhan, String iqamah, String type) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return 0;
        Calendar base = Calendar.getInstance();
        int count = 0;
        Set<String> ids = new HashSet<>(prefs(ctx).getStringSet(KEY_ALARM_IDS, new HashSet<>()));

        if (adhan != null && !adhan.isEmpty()) {
            Calendar when = parseTime(adhan, base, true);
            if (when != null) {
                int id = alarmId(prayerName, "adhan");
                PendingIntent pi = buildPending(ctx, id, prayerName, "adhan", adhan, iqamah, type);
                setExact(am, when.getTimeInMillis(), pi);
                ids.add(String.valueOf(id));
                count++;
            }
        }
        if (iqamah != null && !iqamah.isEmpty()) {
            Calendar when = parseTime(iqamah, base, true);
            if (when != null) {
                int id = alarmId(prayerName, "iqamah");
                PendingIntent pi = buildPending(ctx, id, prayerName, "iqamah", adhan, iqamah, type);
                setExact(am, when.getTimeInMillis(), pi);
                ids.add(String.valueOf(id));
                count++;
            }
        }
        prefs(ctx).edit().putStringSet(KEY_ALARM_IDS, ids).apply();
        return count;
    }

    /** Schedule a specific prayer+phase at an explicit millisecond timestamp. */
    public static void scheduleAt(Context ctx, String prayerName, String phase, String adhan, String iqamah, String type, long triggerAtMs) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        int id = alarmId(prayerName, phase);
        PendingIntent pi = buildPending(ctx, id, prayerName, phase, adhan, iqamah, type);
        setExact(am, triggerAtMs, pi);
        Set<String> ids = new HashSet<>(prefs(ctx).getStringSet(KEY_ALARM_IDS, new HashSet<>()));
        ids.add(String.valueOf(id));
        prefs(ctx).edit().putStringSet(KEY_ALARM_IDS, ids).apply();
    }

    private static void setExact(AlarmManager am, long triggerAtMs, PendingIntent pi) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
                } else {
                    // Fallback: inexact but wake-up
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            }
        } catch (SecurityException se) {
            am.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
        }
    }

    /**
     * Persist today's prayer JSON (used by BootReceiver + self-perpetuation) and (re)schedule everything.
     */
    public static int scheduleFromJson(Context ctx, JSONArray prayers) {
        int scheduled = 0;
        try {
            prefs(ctx).edit().putString(KEY_TODAY_PRAYERS, prayers.toString()).apply();
            for (int i = 0; i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                scheduled += scheduleOne(
                        ctx,
                        p.optString("name"),
                        p.optString("adhan"),
                        p.optString("iqamah"),
                        p.optString("type")
                );
            }
        } catch (Exception e) {
            // ignore
        }
        return scheduled;
    }

    public static int rescheduleFromPersisted(Context ctx) {
        String raw = prefs(ctx).getString(KEY_TODAY_PRAYERS, null);
        if (raw == null) return 0;
        try {
            return scheduleFromJson(ctx, new JSONArray(raw));
        } catch (Exception e) {
            return 0;
        }
    }

    public static void cancelAll(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Set<String> ids = prefs(ctx).getStringSet(KEY_ALARM_IDS, new HashSet<>());
        for (String idStr : ids) {
            try {
                int id = Integer.parseInt(idStr);
                Intent i = new Intent(ctx, AlarmReceiver.class);
                i.setAction("app.lovable.adhan_zen_95.ALARM_" + id);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent pi = PendingIntent.getBroadcast(ctx, id, i, flags);
                am.cancel(pi);
            } catch (Exception ignored) {}
        }
        prefs(ctx).edit().remove(KEY_ALARM_IDS).apply();
    }

    public static String todayString() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }
}
