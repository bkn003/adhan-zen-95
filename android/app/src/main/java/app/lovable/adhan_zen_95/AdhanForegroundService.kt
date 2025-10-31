package app.lovable.adhan_zen_95

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground service that plays Adhan audio
 * Ensures audio playback even when app is closed or in background
 */
class AdhanForegroundService : Service() {
    
    private var mediaPlayer: MediaPlayer? = null
    private val CHANNEL_ID = "adhan_playback_channel"
    private val NOTIFICATION_ID = 1001
    
    companion object {
        private const val TAG = "AdhanForegroundService"
        const val ACTION_PLAY_ADHAN = "app.lovable.adhan_zen_95.PLAY_ADHAN"
        const val EXTRA_PRAYER_NAME = "prayer_name"
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")
        
        val prayerName = intent?.getStringExtra(EXTRA_PRAYER_NAME) ?: "Prayer"
        
        // Start foreground with notification
        val notification = createNotification(prayerName)
        startForeground(NOTIFICATION_ID, notification)
        
        // Play Adhan audio
        playAdhan()
        
        return START_NOT_STICKY
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Adhan Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Playing Adhan audio"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(prayerName: String): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("$prayerName Adhan")
            .setContentText("Playing Adhan...")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
    
    private fun playAdhan() {
        try {
            // Release any existing player
            mediaPlayer?.release()
            
            // Create new MediaPlayer
            mediaPlayer = MediaPlayer().apply {
                // Use the bundled Adhan audio from res/raw
                setDataSource(
                    applicationContext,
                    android.net.Uri.parse("android.resource://${packageName}/raw/azan1")
                )
                
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build()
                )
                
                setOnCompletionListener {
                    Log.d(TAG, "Adhan playback completed")
                    stopSelf()
                }
                
                setOnErrorListener { _, what, extra ->
                    Log.e(TAG, "MediaPlayer error: what=$what, extra=$extra")
                    stopSelf()
                    true
                }
                
                prepare()
                start()
                
                Log.d(TAG, "Adhan playback started")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play Adhan", e)
            stopSelf()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
        
        mediaPlayer?.apply {
            if (isPlaying) {
                stop()
            }
            release()
        }
        mediaPlayer = null
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
