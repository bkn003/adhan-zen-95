package app.lovable.adhan_zen_95

import android.content.Context
import android.util.Log

/**
 * Initializes Adhan system on first app launch
 */
object AdhanInitializer {
    
    private const val TAG = "AdhanInitializer"
    private const val PREFS_NAME = "CapacitorPreferences"
    private const val KEY_INITIALIZED = "adhan_system_initialized"
    
    fun initializeIfNeeded(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val isInitialized = prefs.getBoolean(KEY_INITIALIZED, false)
        
        if (!isInitialized) {
            Log.d(TAG, "First launch - initializing Adhan system")
            
            // Schedule daily updates
            AdhanDailyUpdateReceiver.scheduleDailyUpdate(context)
            
            // Mark as initialized
            prefs.edit().putBoolean(KEY_INITIALIZED, true).apply()
            
            Log.d(TAG, "Adhan system initialized successfully")
        }
    }
}
