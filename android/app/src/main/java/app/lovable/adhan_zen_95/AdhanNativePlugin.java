package app.lovable.adhan_zen_95;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Native bridge exposing reliable prayer alarms + selected-location persistence to JS.
 * Method surface intentionally matches src/native/dndService.ts so the existing JS layer
 * keeps working. Non-alarm methods are safe no-op stubs returning sensible defaults for
 * Phase 1; they will be filled in progressively.
 */
@CapacitorPlugin(name = "AdhanNative")
public class AdhanNativePlugin extends Plugin {

    private static final String PREFS = "AdhanNativePrefs";
    private static final String KEY_SELECTED_LOCATION = "selected_location_id";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // -------- Reliable alarms (Phase 1: the core feature) --------

    @PluginMethod
    public void scheduleReliableAlarms(PluginCall call) {
        JSArray prayers = call.getArray("prayers");
        if (prayers == null) { call.reject("Missing 'prayers'"); return; }
        try {
            NotifChannels.ensure(getContext());
            // Cancel previous scheduled alarms so time changes propagate
            AlarmScheduler.cancelAll(getContext());
            JSONArray arr = new JSONArray(prayers.toString());
            int count = AlarmScheduler.scheduleFromJson(getContext(), arr);
            JSObject ret = new JSObject();
            ret.put("scheduledCount", count);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to schedule alarms: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        AlarmScheduler.cancelAll(getContext());
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    // -------- Selected location persistence (used by BootReceiver / background sync) --------

    @PluginMethod
    public void saveSelectedLocation(PluginCall call) {
        String id = call.getString("locationId");
        prefs().edit().putString(KEY_SELECTED_LOCATION, id).apply();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getSelectedLocation(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("locationId", prefs().getString(KEY_SELECTED_LOCATION, null));
        call.resolve(ret);
    }

    @PluginMethod
    public void refreshPrayerTimes(PluginCall call) {
        // Kick a one-time background sync via WorkManager
        try { SyncScheduler.runOnce(getContext()); } catch (Throwable ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    /**
     * Configure the background sync source. Called from JS whenever the user
     * selects/changes their mosque so the daily WorkManager job knows what to
     * fetch even when the app is closed.
     *
     * Params: { baseUrl: string, locationSlug: string, mosqueName?: string }
     */
    @PluginMethod
    public void configureBackgroundSync(PluginCall call) {
        String baseUrl = call.getString("baseUrl");
        String slug = call.getString("locationSlug");
        String mosqueName = call.getString("mosqueName", "Your Mosque");
        if (baseUrl == null || slug == null) { call.reject("Missing baseUrl or locationSlug"); return; }

        SharedPreferences p = getContext().getSharedPreferences(PrayerSyncWorker.PREFS, Context.MODE_PRIVATE);
        p.edit()
                .putString(PrayerSyncWorker.KEY_BASE_URL, baseUrl)
                .putString(PrayerSyncWorker.KEY_SLUG, slug)
                .putString(PrayerSyncWorker.KEY_MOSQUE_NAME, mosqueName)
                .apply();

        try {
            SyncScheduler.enqueueDaily(getContext());
            SyncScheduler.runOnce(getContext());
        } catch (Throwable ignored) {}

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }


    // -------- Battery optimization --------

    @PluginMethod
    public void checkBatteryOptimization(PluginCall call) {
        JSObject ret = new JSObject();
        boolean ignoring = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (pm != null) ignoring = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        String mfr = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase();
        boolean aggressive = mfr.contains("xiaomi") || mfr.contains("huawei") || mfr.contains("oppo") ||
                mfr.contains("vivo") || mfr.contains("realme") || mfr.contains("oneplus");
        ret.put("isIgnoring", ignoring);
        ret.put("isAggressiveDevice", aggressive);
        ret.put("manufacturer", Build.MANUFACTURER == null ? "" : Build.MANUFACTURER);
        ret.put("shouldShowPrompt", !ignoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimization(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                i.setData(Uri.parse("package:" + getContext().getPackageName()));
                i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void openManufacturerBatterySettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
            i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void ignoreBatteryOptimizationPrompt(PluginCall call) {
        prefs().edit().putBoolean("battery_prompt_ignored", true).apply();
        call.resolve();
    }

    // -------- DND / countdown / adhan-sound / vibration stubs --------
    // (Phase 1 no-ops that return safe defaults so the existing JS bridge doesn't throw.)

    @PluginMethod public void checkDndPermission(PluginCall call) {
        JSObject r = new JSObject(); r.put("granted", false); call.resolve(r);
    }
    @PluginMethod public void requestDndPermission(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
            i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception ignored) {}
        call.resolve();
    }
    @PluginMethod public void enableDnd(PluginCall call) {
        JSObject r = new JSObject(); r.put("success", false); call.resolve(r);
    }
    @PluginMethod public void disableDnd(PluginCall call) {
        JSObject r = new JSObject(); r.put("success", false); call.resolve(r);
    }
    @PluginMethod public void scheduleDndForPrayers(PluginCall call) {
        JSObject r = new JSObject(); r.put("scheduledCount", 0); call.resolve(r);
    }
    @PluginMethod public void getDndSettings(PluginCall call) {
        JSObject r = new JSObject();
        r.put("enabled", false);
        r.put("beforeMinutes", 5);
        r.put("afterMinutes", 15);
        JSArray arr = new JSArray();
        arr.put("fajr"); arr.put("dhuhr"); arr.put("asr"); arr.put("maghrib"); arr.put("isha");
        r.put("enabledPrayers", arr);
        call.resolve(r);
    }
    @PluginMethod public void saveDndSettings(PluginCall call) { call.resolve(); }

    @PluginMethod public void updateCountdownPrayers(PluginCall call) {
        JSObject r = new JSObject(); r.put("success", true); call.resolve(r);
    }

    @PluginMethod public void getAvailableAdhans(PluginCall call) {
        JSArray arr = new JSArray();
        JSObject a = new JSObject();
        a.put("id", "azan1"); a.put("name", "Adhan"); a.put("description", "Default adhan");
        arr.put(a);
        JSObject r = new JSObject(); r.put("adhans", arr); call.resolve(r);
    }
    @PluginMethod public void getAdhanSettings(PluginCall call) {
        JSObject r = new JSObject();
        r.put("selectedAdhan", "azan1");
        r.put("fajrAdhan", "azan1");
        r.put("volume", 100);
        call.resolve(r);
    }
    @PluginMethod public void setAdhanSelection(PluginCall call) {
        JSObject r = new JSObject(); r.put("success", true); call.resolve(r);
    }
    @PluginMethod public void getVibrationSettings(PluginCall call) {
        JSObject r = new JSObject();
        r.put("enabled", true);
        r.put("patternId", "default");
        JSArray patterns = new JSArray();
        JSObject p = new JSObject(); p.put("id", "default"); p.put("name", "Default"); patterns.put(p);
        r.put("patterns", patterns);
        call.resolve(r);
    }
    @PluginMethod public void setVibrationSettings(PluginCall call) { call.resolve(); }
}
