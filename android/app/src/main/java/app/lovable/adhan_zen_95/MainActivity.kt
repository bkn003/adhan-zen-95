package app.lovable.adhan_zen_95

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import app.lovable.adhan_zen_95.ui.navigation.AdhanNavigation
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d("MainActivity", "🚀 Starting Native App with Network")
        
        try { enableEdgeToEdge() } catch (e: Exception) {
            Log.e("MainActivity", "EdgeToEdge init failed", e)
        }
        
        // Initialize alarm system
        try {
            AdhanInitializer.initializeIfNeeded(this)
            AdhanDailyUpdateReceiver.scheduleDailyUpdate(this)
            AlarmHealthWorker.schedule(this)
        } catch (e: Exception) {
            Log.e("MainActivity", "Alarm init failed", e)
        }
        
        setContent {
            MaterialTheme {
                AdhanNavigation()
            }
        }
    }
}
