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
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class AdhanForegroundService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var volumeReceiver: BroadcastReceiver? = null
    private var screenReceiver: BroadcastReceiver? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var initialVolume: Int = -1
    private val CHANNEL_ID = "adhan_playback_channel"
    private val NOTIFICATION_ID = 1001
    private var currentPrayerName: String? = null
    
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
                currentPrayerName = prayerName
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
                        Log.d(TAG, "📱 Screen ON - ignoring (waiting for unlock)")
                        // Do NOT stop adhan just because screen turned on
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
            // REMOVED: ACTION_SCREEN_ON - this was too aggressive/annoying
            // Device unlock (USER_PRESENT) is sufficient for stopping
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
            
            // Get the selected adhan sound based on user preference and prayer
            val prayerName = currentPrayerName ?: "Prayer"
            val adhanResourceName = AdhanSoundManager.getAdhanForPrayer(applicationContext, prayerName)
            val adhanResId = AdhanSoundManager.getAdhanResourceId(applicationContext, adhanResourceName)
            
            Log.d(TAG, "▶️ Playing adhan: $adhanResourceName for $prayerName")
            
            // Start vibration if enabled
            if (AdhanSoundManager.getVibrationEnabled(applicationContext)) {
                startVibration()
            }
            
            // Acquire WakeLock to keep CPU running during playback
            acquireWakeLock()
            
            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, android.net.Uri.parse("android.resource://$packageName/$adhanResId"))
                setAudioAttributes(AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build())
                
                // Set volume based on user preference
                val volumePercent = AdhanSoundManager.getAdhanVolume(applicationContext)
                val volume = volumePercent / 100f
                setVolume(volume, volume)
                
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
            stopVibration()
            releaseWakeLock()
            isPlaying = false
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping adhan", e)
            mediaPlayer = null
            stopVibration()
            releaseWakeLock()
            isPlaying = false
        }
    }
    
    private fun startVibration() {
        try {
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (vibrator?.hasVibrator() == true) {
                val patternEnum = AdhanSoundManager.getVibrationPattern(applicationContext)
                val timings = patternEnum.pattern
                
                Log.d(TAG, "📳 Starting vibration: ${patternEnum.displayName}")
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(timings, -1))
                } else {
                    vibrator?.vibrate(timings, -1)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start vibration", e)
        }
    }

    private fun stopVibration() {
        try {
            vibrator?.cancel()
            vibrator = null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop vibration", e)
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
    
    private fun acquireWakeLock() {
        try {
            if (wakeLock == null) {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AdhanZen:PlaybackWakeLock")
                wakeLock?.setReferenceCounted(false)
            }
            
            if (wakeLock?.isHeld == false) {
                wakeLock?.acquire(10 * 60 * 1000L) // 10 minutes max timeout as failsafe
                Log.d(TAG, "⚡ WakeLock acquired for playback")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire WakeLock", e)
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(TAG, "⚡ WakeLock released")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to release WakeLock", e)
        }
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
