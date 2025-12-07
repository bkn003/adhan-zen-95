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
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class AdhanForegroundService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var volumeReceiver: BroadcastReceiver? = null
    private val CHANNEL_ID = "adhan_playback_channel"
    private val NOTIFICATION_ID = 1001
    
    companion object {
        const val TAG = "AdhanForegroundService"
        const val ACTION_PLAY_ADHAN = "app.lovable.adhan_zen_95.PLAY_ADHAN"
        const val ACTION_STOP_ADHAN = "app.lovable.adhan_zen_95.STOP_ADHAN"
        const val EXTRA_PRAYER_NAME = "prayer_name"
        
        private var isPlaying = false
        
        fun stopAdhan(context: Context) {
            val intent = Intent(context, AdhanForegroundService::class.java).apply {
                action = ACTION_STOP_ADHAN
            }
            context.stopService(intent)
        }
        
        fun isCurrentlyPlaying(): Boolean = isPlaying
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        registerVolumeReceiver()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_ADHAN -> {
                Log.d(TAG, "Stop action received - stopping Adhan")
                stopAdhan()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_PLAY_ADHAN -> {
                val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: "Prayer"
                Log.d(TAG, "Play Adhan for $prayerName")
                startForeground(NOTIFICATION_ID, createNotification(prayerName))
                playAdhan()
            }
        }
        return START_NOT_STICKY
    }
    
    private fun registerVolumeReceiver() {
        // Listen for volume button presses to stop adhan
        volumeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    "android.media.VOLUME_CHANGED_ACTION",
                    Intent.ACTION_SCREEN_OFF -> {
                        Log.d(TAG, "Volume/screen action detected - stopping adhan")
                        stopAdhan()
                        stopSelf()
                    }
                }
            }
        }
        
        val filter = IntentFilter().apply {
            addAction("android.media.VOLUME_CHANGED_ACTION")
            addAction(Intent.ACTION_SCREEN_OFF)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(volumeReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(volumeReceiver, filter)
        }
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
        
        // Stop action
        val stopIntent = Intent(this, AdhanForegroundService::class.java).apply {
            action = ACTION_STOP_ADHAN
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent, 
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        val prayerColor = getPrayerColor(prayerName)
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🕌 $prayerName Adhan")
            .setContentText("Tap STOP or press volume button to stop")
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(prayerColor)
            .setColorized(true)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_pause, "STOP", stopPendingIntent)
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
                    Log.d(TAG, "Adhan playback completed")
                    Companion.isPlaying = false
                    stopSelf() 
                }
                setOnErrorListener { _, what, extra -> 
                    Log.e(TAG, "MediaPlayer error: what=$what, extra=$extra")
                    Companion.isPlaying = false
                    stopSelf()
                    true 
                }
                prepare()
                start()
                Companion.isPlaying = true
                Log.d(TAG, "Adhan playback started")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play adhan", e)
            Companion.isPlaying = false
            stopSelf()
        }
    }
    
    private fun stopAdhan() {
        try {
            mediaPlayer?.apply {
                if (this.isPlaying) {
                    stop()
                    Log.d(TAG, "Adhan stopped")
                }
                release()
            }
            mediaPlayer = null
            Companion.isPlaying = false
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping adhan", e)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopAdhan()
        try {
            volumeReceiver?.let { unregisterReceiver(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering receiver", e)
        }
        volumeReceiver = null
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
}
