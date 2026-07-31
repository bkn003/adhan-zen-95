package app.lovable.adhan_zen_95;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Runs daily (via WorkManager) even when the app is not open.
 * - Fetches the current-month prayer times JSON from the configured base URL
 *   (pattern: <baseUrl>/prayer_times/<slug>/<yyyy-mm>.json)
 * - Diffs the upcoming 7 days against the last cached snapshot
 * - Posts a "Prayer Times Changed" notification listing changes
 * - Re-schedules today's AlarmManager alarms from the freshly fetched data
 *   so alarms keep firing indefinitely without opening the app.
 */
public class PrayerSyncWorker extends Worker {

    static final String PREFS = "AdhanNativePrefs";
    static final String KEY_BASE_URL = "sync_base_url";
    static final String KEY_SLUG = "sync_location_slug";
    static final String KEY_MOSQUE_NAME = "sync_mosque_name";
    static final String KEY_LAST_SNAPSHOT = "sync_last_snapshot";
    static final String KEY_LAST_SYNC_AT = "sync_last_at";
    static final String KEY_LAST_STATUS = "sync_last_status";
    static final String KEY_LAST_CHANGES = "sync_last_changes";

    private static final String[] PRAYER_FIELDS = {
            "fajr", "dhuhr", "asr", "maghrib", "isha",
            "fajr_iqamah", "dhuhr_iqamah", "asr_iqamah", "maghrib_iqamah", "isha_iqamah",
            "sahar_end", "ifthar_time", "tharaweeh",
            "fajr_ramadan_iqamah", "isha_ramadan_iqamah", "maghrib_ramadan_adhan"
    };

    public PrayerSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String baseUrl = prefs.getString(KEY_BASE_URL, null);
        String slug = prefs.getString(KEY_SLUG, null);
        String mosqueName = prefs.getString(KEY_MOSQUE_NAME, "Your Mosque");
        if (baseUrl == null || slug == null) {
            return Result.success();
        }

        try {
            String month = new SimpleDateFormat("yyyy-MM", Locale.US).format(new Date());
            String url = baseUrl.replaceAll("/+$", "") + "/prayer_times/" + slug + "/" + month + ".json";
            String json = fetch(url);
            if (json == null) return Result.retry();

            JSONArray fresh = new JSONArray(json);

            // Snapshot the next-7-day window (date -> {field: value})
            Map<String, JSONObject> freshByDate = snapshotWindow(fresh, 7);

            // Compare with previous snapshot
            String prevRaw = prefs.getString(KEY_LAST_SNAPSHOT, null);
            List<String> changes = new ArrayList<>();
            if (prevRaw != null) {
                try {
                    JSONObject prev = new JSONObject(prevRaw);
                    changes = diff(prev, freshByDate);
                } catch (Exception ignored) {}
            }

            // Persist new snapshot
            JSONObject snap = new JSONObject();
            for (Map.Entry<String, JSONObject> e : freshByDate.entrySet()) {
                snap.put(e.getKey(), e.getValue());
            }
            prefs.edit().putString(KEY_LAST_SNAPSHOT, snap.toString()).apply();

            // Re-schedule today's alarms from fresh data (extends unlimited-day reliability)
            JSONArray todayPrayers = buildTodayPrayerArray(fresh);
            if (todayPrayers != null && todayPrayers.length() > 0) {
                NotifChannels.ensure(ctx);
                AlarmScheduler.cancelAll(ctx);
                AlarmScheduler.scheduleFromJson(ctx, todayPrayers);
            }

            // Record status for the in-app "Background sync" card
            JSONArray changeArr = new JSONArray();
            for (String c : changes) changeArr.put(c);
            prefs.edit()
                    .putLong(KEY_LAST_SYNC_AT, System.currentTimeMillis())
                    .putString(KEY_LAST_STATUS, "success")
                    .putString(KEY_LAST_CHANGES, changeArr.toString())
                    .apply();

            // Post change notification if anything shifted
            if (!changes.isEmpty()) {
                postChangeNotification(ctx, mosqueName, changes);
            }
            return Result.success();
        } catch (Exception e) {
            prefs.edit()
                    .putLong(KEY_LAST_SYNC_AT, System.currentTimeMillis())
                    .putString(KEY_LAST_STATUS, "error")
                    .apply();
            return Result.retry();
        }
    }

    // --------- helpers ---------

    private static String fetch(String url) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);
            conn.setRequestProperty("Accept", "application/json");
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return null;
            BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            r.close();
            return sb.toString();
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static Map<String, JSONObject> snapshotWindow(JSONArray arr, int days) throws Exception {
        Map<String, JSONObject> out = new HashMap<>();
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        Calendar c = Calendar.getInstance();
        for (int i = 0; i < days; i++) {
            String d = df.format(c.getTime());
            JSONObject entry = findForDate(arr, d);
            if (entry != null) {
                JSONObject slim = new JSONObject();
                for (String f : PRAYER_FIELDS) {
                    if (entry.has(f)) slim.put(f, entry.optString(f, ""));
                }
                out.put(d, slim);
            }
            c.add(Calendar.DAY_OF_MONTH, 1);
        }
        return out;
    }

    private static JSONObject findForDate(JSONArray arr, String dateIso) throws Exception {
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.getJSONObject(i);
            String d = o.optString("date", "");
            if (dateIso.equals(d)) return o;
            String from = o.optString("date_from", "");
            String to = o.optString("date_to", "");
            if (!from.isEmpty() && !to.isEmpty()
                    && dateIso.compareTo(from) >= 0 && dateIso.compareTo(to) <= 0) {
                return o;
            }
        }
        return null;
    }

    private static List<String> diff(JSONObject prev, Map<String, JSONObject> fresh) {
        List<String> changes = new ArrayList<>();
        SimpleDateFormat pretty = new SimpleDateFormat("EEE d MMM", Locale.getDefault());
        SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        for (Map.Entry<String, JSONObject> e : fresh.entrySet()) {
            String date = e.getKey();
            JSONObject newObj = e.getValue();
            JSONObject oldObj = prev.optJSONObject(date);
            if (oldObj == null) continue;
            for (String f : PRAYER_FIELDS) {
                String a = oldObj.optString(f, "");
                String b = newObj.optString(f, "");
                if (!a.isEmpty() && !b.isEmpty() && !a.equals(b)) {
                    String label;
                    try {
                        label = pretty.format(iso.parse(date));
                    } catch (Exception ex) {
                        label = date;
                    }
                    changes.add(label + " · " + prettyField(f) + ": " + a + " → " + b);
                    if (changes.size() >= 8) return changes;
                }
            }
        }
        return changes;
    }

    private static String prettyField(String f) {
        switch (f) {
            case "fajr": return "Fajr";
            case "dhuhr": return "Zuhr";
            case "asr": return "Asr";
            case "maghrib": return "Maghrib";
            case "isha": return "Isha";
            case "fajr_iqamah": return "Fajr Iqamah";
            case "dhuhr_iqamah": return "Zuhr Iqamah";
            case "asr_iqamah": return "Asr Iqamah";
            case "maghrib_iqamah": return "Maghrib Iqamah";
            case "isha_iqamah": return "Isha Iqamah";
            case "sahar_end": return "Sahar End";
            case "ifthar_time": return "Iftar";
            case "tharaweeh": return "Tharaweeh";
            default: return f;
        }
    }

    private static JSONArray buildTodayPrayerArray(JSONArray fresh) throws Exception {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        JSONObject e = findForDate(fresh, today);
        if (e == null) return null;
        JSONArray arr = new JSONArray();
        arr.put(buildPrayer("Fajr", e.optString("fajr"), e.optString("fajr_iqamah"), "fajr"));
        arr.put(buildPrayer("Zuhr", e.optString("dhuhr"), e.optString("dhuhr_iqamah"), "dhuhr"));
        arr.put(buildPrayer("Asr", e.optString("asr"), e.optString("asr_iqamah"), "asr"));
        arr.put(buildPrayer("Maghrib", e.optString("maghrib"), e.optString("maghrib_iqamah"), "maghrib"));
        arr.put(buildPrayer("Isha", e.optString("isha"), e.optString("isha_iqamah"), "isha"));
        return arr;
    }

    private static JSONObject buildPrayer(String name, String adhan, String iqamah, String type) throws Exception {
        JSONObject o = new JSONObject();
        o.put("name", name);
        o.put("adhan", adhan == null ? "" : adhan);
        o.put("iqamah", iqamah == null ? "" : iqamah);
        o.put("type", type);
        return o;
    }

    private static void postChangeNotification(Context ctx, String mosqueName, List<String> changes) {
        NotifChannels.ensure(ctx);
        StringBuilder sb = new StringBuilder();
        for (String c : changes) sb.append("• ").append(c).append("\n");

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent contentPi = null;
        if (open != null) {
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            contentPi = PendingIntent.getActivity(ctx, 0, open, flags);
        }

        int iconId = ctx.getResources().getIdentifier("ic_stat_name", "drawable", ctx.getPackageName());
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, NotifChannels.CHANNEL_CHANGES)
                .setSmallIcon(iconId != 0 ? iconId : android.R.drawable.ic_dialog_info)
                .setContentTitle("🕌 Prayer times updated · " + mosqueName)
                .setContentText(changes.get(0))
                .setStyle(new NotificationCompat.BigTextStyle().bigText(sb.toString().trim()))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true);
        if (contentPi != null) b.setContentIntent(contentPi);

        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(("changes_" + System.currentTimeMillis()).hashCode(), b.build());
    }
}
