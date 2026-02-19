package app.lovable.adhan_zen_95

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class for Adhan Zen.
 * Annotated with @HiltAndroidApp to enable Hilt dependency injection.
 */
@HiltAndroidApp
class AdhanZenApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize any app-wide components here
        // The existing alarm system (ReliableAlarmScheduler, etc.) will continue to work
    }
}
