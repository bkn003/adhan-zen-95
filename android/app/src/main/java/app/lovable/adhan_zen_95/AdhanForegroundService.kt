package app.lovable.adhan_zen_95

import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class AdhanForegroundService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var volumeReceiver: BroadcastReceiver? = null
    private var screenReceiver: BroadcastReceiver? = null
    private var initialVolume: Int = -1
    private val CHANNEL_ID = "adhan_playback_channel"
    private val NOTIFICATION_ID = 1001
    
    companion object {
        const val TAG = "AdhanForegroundService"
        const val ACTION_PLAY_ADHAN = "app.lovable.adhan_zen_95.PLAY_ADHAN"
        const val ACTION_STOP_ADHAN = "app.lovable.adhan_zen_95.STOP_ADHAN"
        const val EXTRA_PRAYER_NAME = "prayer_name"
        
        @Volatile
        private var isPlaying = false
        
        fun stopAdhan(context: Context) {
            Log.d(TAG, "Static stopAdhan called")
            val intent = Intent(context, AdhanForegroundService::class.java).apply {
                action = ACTION_STOP_ADHAN
            }
            context.stopService(intent)
        }
        
        fun isCurrentlyPlaying(): Boolean = isPlaying
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate")
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: action=${intent?.action}")
        
        when (intent?.action) {
            ACTION_STOP_ADHAN -> {
                Log.d(TAG, "🛑 Stop action received - stopping Adhan IMMEDIATELY")
                stopAdhanAndService()
                return START_NOT_STICKY
            }
            ACTION_PLAY_ADHAN -> {
                val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: "Prayer"
                Log.d(TAG, "▶️ Play Adhan for $prayerName")
                
                // Start foreground first
                startForeground(NOTIFICATION_ID, createNotification(prayerName))
                
                // Register receivers AFTER starting foreground
                registerVolumeReceiver()
                registerScreenReceiver()
                
                // Play adhan
                playAdhan()
            }
        }
        return START_NOT_STICKY
    }
    
    /**
     * Register volume change receiver - stops adhan when any volume button is pressed
     */
    private fun registerVolumeReceiver() {
        if (volumeReceiver != null) return // Already registered
        
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        initialVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
        Log.d(TAG, "📊 Initial volume: $initialVolume")
        
        volumeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == "android.media.VOLUME_CHANGED_ACTION") {
                    val streamType = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_TYPE", -1)
                    Log.d(TAG, "🔊 Volume changed detected! Stream: $streamType")
                    
                    // Stop on ANY volume change (up or down, any stream)
                    Log.d(TAG, "🛑 Stopping adhan due to volume button press")
                    stopAdhanAndService()
                }
            }
        }
        
        val filter = IntentFilter("android.media.VOLUME_CHANGED_ACTION")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(volumeReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(volumeReceiver, filter)
        }
        Log.d(TAG, "✅ Volume receiver registered")
    }
    
    /**
     * Register screen receiver - stops adhan when power button is pressed (screen on/off)
     */
    private fun registerScreenReceiver() {
        if (screenReceiver != null) return // Already registered
        
        screenReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    Intent.ACTION_SCREEN_OFF -> {
                        Log.d(TAG, "📱 Screen OFF (power button pressed) - stopping adhan")
                        stopAdhanAndService()
                    }
                    Intent.ACTION_SCREEN_ON -> {
                        Log.d(TAG, "📱 Screen ON (power button pressed) - stopping adhan")
                        stopAdhanAndService()
                    }
                    Intent.ACTION_USER_PRESENT -> {
                        Log.d(TAG, "📱 User present (device unlocked) - stopping adhan")
                        stopAdhanAndService()
                    }
                }
            }
        }
        
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(screenReceiver, filter)
        }
        Log.d(TAG, "✅ Screen receiver registered")
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Adhan Playback", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Playing Adhan audio"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(prayerName: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, 
            Intent(this, MainActivity::class.java), 
            PendingIntent.FLAG_IMMUTABLE
        )
        
        // Stop action - uses broadcast receiver for more reliable stopping
        val stopIntent = Intent(this, AdhanStopReceiver::class.java)
        val stopPendingIntent = PendingIntent.getBroadcast(
            this, 0, stopIntent, 
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        val prayerColor = getPrayerColor(prayerName)
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🕌 $prayerName Adhan")
            .setContentText("Tap STOP, press volume/power button, or swipe to stop")
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(prayerColor)
            .setColorized(true)
            .setContentIntent(pendingIntent)
            .setOngoing(false)  // Allow swipe to dismiss
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_pause, "🛑 STOP", stopPendingIntent)
            .setDeleteIntent(stopPendingIntent) // Stop when notification is swiped
            .build()
    }
    
    private fun getPrayerColor(prayerName: String): Int {
        return when {
            prayerName.contains("Fajr", ignoreCase = true) -> 0xFF6366F1.toInt()
            prayerName.contains("Dhuhr", ignoreCase = true) || 
            prayerName.contains("Jummah", ignoreCase = true) -> 0xFFF59E0B.toInt()
            prayerName.contains("Asr", ignoreCase = true) -> 0xFF0EA5E9.toInt()
            prayerName.contains("Maghrib", ignoreCase = true) -> 0xFFF97316.toInt()
            prayerName.contains("Isha", ignoreCase = true) -> 0xFF8B5CF6.toInt()
            else -> 0xFF10B981.toInt()
        }
    }
    
    private fun playAdhan() {
        try {
            stopAdhan() // Stop any existing playback
            
            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, android.net.Uri.parse("android.resource://$packageName/raw/adhan"))
                setAudioAttributes(AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build())
                setOnCompletionListener { 
                    Log.d(TAG, "✅ Adhan playback completed naturally")
                    Companion.isPlaying = false
                    stopSelf() 
                }
                setOnErrorListener { _, what, extra -> 
                    Log.e(TAG, "❌ MediaPlayer error: what=$what, extra=$extra")
                    Companion.isPlaying = false
                    stopSelf()
                    true 
                }
                prepare()
                start()
                Companion.isPlaying = true
                Log.d(TAG, "▶️ Adhan playback started")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to play adhan", e)
            isPlaying = false
            stopSelf()
        }
    }
    
    private fun stopAdhan() {
        try {
            mediaPlayer?.let { player ->
                if (player.isPlaying) {
                    player.stop()
                    Log.d(TAG, "🛑 Adhan audio stopped")
                }
                player.release()
            }
            mediaPlayer = null
            isPlaying = false
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping adhan", e)
            mediaPlayer = null
            isPlaying = false
        }
    }
    
    private fun stopAdhanAndService() {
        Log.d(TAG, "🛑 stopAdhanAndService called")
        stopAdhan()
        unregisterReceivers()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }
    
    private fun unregisterReceivers() {
        try {
            volumeReceiver?.let { 
                unregisterReceiver(it) 
                Log.d(TAG, "Volume receiver unregistered")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering volume receiver", e)
        }
        volumeReceiver = null
        
        try {
            screenReceiver?.let { 
                unregisterReceiver(it) 
                Log.d(TAG, "Screen receiver unregistered")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering screen receiver", e)
        }
        screenReceiver = null
    }
    
    override fun onDestroy() {
        Log.d(TAG, "Service onDestroy")
        super.onDestroy()
        stopAdhan()
        unregisterReceivers()
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
}

/**
 * Separate broadcast receiver for stop action - more reliable than service intent
 */
class AdhanStopReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        Log.d("AdhanStopReceiver", "🛑 Stop broadcast received")
        AdhanForegroundService.stopAdhan(context)
    }
}
