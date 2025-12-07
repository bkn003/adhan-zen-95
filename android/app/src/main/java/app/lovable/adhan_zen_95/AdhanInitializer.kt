package app.lovable.adhan_zen_95

import android.content.Context
import android.util.Log

object AdhanInitializer {
    private const val PREFS_NAME = "adhan_init_prefs"
    private const val KEY_INITIALIZED = "initialized"
    
    fun initializeIfNeeded(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_INITIALIZED, false)) {
            Log.d("AdhanInitializer", "First launch initialization")
            prefs.edit().putBoolean(KEY_INITIALIZED, true).apply()
        }
    }
}
