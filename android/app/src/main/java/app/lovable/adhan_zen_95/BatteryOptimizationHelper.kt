package app.lovable.adhan_zen_95

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * Helper class for managing battery optimization settings.
 * Disabling battery optimization is crucial for reliable alarm functionality.
 */
object BatteryOptimizationHelper {
    private const val TAG = "BatteryOptimization"
    private const val PREFS_NAME = "battery_optimization_prefs"
    private const val KEY_PROMPT_SHOWN = "prompt_shown"
    private const val KEY_OPTIMIZATION_IGNORED = "optimization_ignored"
    
    /**
     * Check if app is ignoring battery optimizations
     */
    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val packageName = context.packageName
            val isIgnoring = powerManager.isIgnoringBatteryOptimizations(packageName)
            Log.d(TAG, "Battery optimization status: ${if (isIgnoring) "IGNORED (good)" else "ACTIVE (needs attention)"}")
            return isIgnoring
        }
        return true // Pre-Marshmallow doesn't have this restriction
    }
    
    /**
     * Request to disable battery optimization
     * Opens system settings to allow user to whitelist the app
     */
    fun requestDisableBatteryOptimization(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                Log.d(TAG, "✅ Opened battery optimization settings")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open battery optimization settings, trying fallback", e)
                openBatterySettings(context)
            }
        }
    }
    
    /**
     * Fallback: Open general battery settings
     */
    fun openBatterySettings(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open battery settings", e)
        }
    }
    
    /**
     * Check if we should show the battery optimization prompt
     */
    fun shouldShowPrompt(context: Context): Boolean {
        // Always check if optimization is needed
        if (isIgnoringBatteryOptimizations(context)) {
            return false // Already optimized
        }
        
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val ignored = prefs.getBoolean(KEY_OPTIMIZATION_IGNORED, false)
        
        // Show prompt if not already ignored by user
        return !ignored
    }
    
    /**
     * Mark prompt as shown
     */
    fun markPromptShown(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_PROMPT_SHOWN, true)
            .apply()
    }
    
    /**
     * User chose to ignore the optimization prompt
     */
    fun ignoreOptimizationPrompt(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_OPTIMIZATION_IGNORED, true)
            .apply()
    }
    
    /**
     * Reset prompt (for testing or settings)
     */
    fun resetPromptStatus(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply()
    }
    
    /**
     * Get device manufacturer for special ROM handling
     */
    fun getDeviceManufacturer(): String {
        return Build.MANUFACTURER.lowercase()
    }
    
    /**
     * Check if device is from a manufacturer known for aggressive battery optimization
     */
    fun isAggressiveBatteryManufacturer(): Boolean {
        val manufacturer = getDeviceManufacturer()
        val aggressiveManufacturers = listOf(
            "xiaomi", "redmi", "poco",  // Xiaomi
            "oppo", "realme", "oneplus", // BBK
            "vivo", "iqoo",
            "huawei", "honor",
            "samsung",
            "asus",
            "lenovo",
            "meizu"
        )
        return aggressiveManufacturers.any { manufacturer.contains(it) }
    }
    
    /**
     * Open manufacturer-specific battery/autostart settings
     */
    fun openManufacturerBatterySettings(context: Context) {
        val manufacturer = getDeviceManufacturer()
        
        val intents = when {
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
                listOf(
                    Intent().setClassName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
                    Intent().setClassName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity")
                )
            }
            manufacturer.contains("oppo") || manufacturer.contains("realme") -> {
                listOf(
                    Intent().setClassName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
                    Intent().setClassName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")
                )
            }
            manufacturer.contains("vivo") -> {
                listOf(
                    Intent().setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
                    Intent().setClassName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")
                )
            }
            manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                listOf(
                    Intent().setClassName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
                    Intent().setClassName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")
                )
            }
            manufacturer.contains("samsung") -> {
                listOf(
                    Intent().setClassName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity")
                )
            }
            else -> emptyList()
        }
        
        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.d(TAG, "✅ Opened manufacturer settings: ${intent.component}")
                return
            } catch (e: Exception) {
                Log.w(TAG, "Failed to open: ${intent.component}")
            }
        }
        
        // Fallback to general battery settings
        openBatterySettings(context)
    }
}
