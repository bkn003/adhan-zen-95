package app.lovable.adhan_zen_95

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.*

/**
 * Foreground service that shows a persistent notification with real-time countdown
 * to the next prayer time (Adhan). Updates every second.
 */
class PrayerCountdownService : Service() {
    companion object {
        private const val TAG = "PrayerCountdownService"
        const val CHANNEL_ID = "prayer_countdown_channel"
        const val NOTIFICATION_ID = 7777
        const val PREFS_NAME = "prayer_countdown_prefs"
        
        const val ACTION_START = "app.lovable.adhan_zen_95.START_COUNTDOWN"
        const val ACTION_STOP = "app.lovable.adhan_zen_95.STOP_COUNTDOWN"
        const val ACTION_UPDATE_PRAYERS = "app.lovable.adhan_zen_95.UPDATE_PRAYERS"
        
        const val EXTRA_PRAYERS_JSON = "prayers_json"
    }
    
    private var handler: Handler? = null
    private var runnable: Runnable? = null
    private var nextPrayerName: String = "Next Prayer"
    private var nextPrayerTimeMillis: Long = 0L
    private var prayers: List<PrayerInfo> = emptyList()
    
    data class PrayerInfo(
        val name: String,
        val adhanTime: String, // "HH:mm" or "hh:mm a"
        val adhanMillis: Long
    )
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        handler = Handler(Looper.getMainLooper())
        Log.d(TAG, "🚀 PrayerCountdownService created")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: action=${intent?.action}")
        
        when (intent?.action) {
            ACTION_START -> {
                loadPrayersFromPrefs()
                startForeground(NOTIFICATION_ID, createNotification())
                startCountdown()
            }
            ACTION_STOP -> {
                stopCountdown()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            ACTION_UPDATE_PRAYERS -> {
                val json = intent.getStringExtra(EXTRA_PRAYERS_JSON)
                if (json != null) {
                    savePrayersToPrefs(json)
                    parsePrayers(json)
                    updateNextPrayer()
                    updateNotification()
                }
            }
            else -> {
                // Default: start the countdown
                loadPrayersFromPrefs()
                startForeground(NOTIFICATION_ID, createNotification())
                startCountdown()
            }
        }
        
        return START_STICKY
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Prayer Countdown",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows countdown to next prayer time"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val countdown = getCountdownText()
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        // Get prayer-specific color
        val prayerColor = getPrayerColor(nextPrayerName)
        
        // Get large icon from app launcher icon
        val largeIcon = android.graphics.BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
        
        // Format time for display
        val adhanTimeText = if (nextPrayerTimeMillis > 0) {
            val sdf = java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault())
            "Adhan at ${sdf.format(java.util.Date(nextPrayerTimeMillis))}"
        } else {
            "Loading..."
        }
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(largeIcon)
            .setContentTitle("🕌 $nextPrayerName Prayer")
            .setContentText("⏱️ $countdown")
            .setSubText(adhanTimeText)
            .setColor(prayerColor)
            .setColorized(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setContentIntent(pendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setStyle(NotificationCompat.BigTextStyle()
                .setBigContentTitle("🕌 $nextPrayerName Prayer")
                .setSummaryText("Adhan Zen")
                .bigText("⏱️ $countdown remaining\n📿 $adhanTimeText\n📍 Tap to open app"))
            .build()
    }
    
    private fun getPrayerColor(prayerName: String): Int {
        return when {
            prayerName.contains("Fajr", ignoreCase = true) -> 0xFF6366F1.toInt() // Indigo
            prayerName.contains("Dhuhr", ignoreCase = true) || 
            prayerName.contains("Jummah", ignoreCase = true) -> 0xFFF59E0B.toInt() // Amber
            prayerName.contains("Asr", ignoreCase = true) -> 0xFF0EA5E9.toInt() // Sky
            prayerName.contains("Maghrib", ignoreCase = true) -> 0xFFF97316.toInt() // Orange
            prayerName.contains("Isha", ignoreCase = true) -> 0xFF8B5CF6.toInt() // Purple
            else -> 0xFF10B981.toInt() // Emerald (default)
        }
    }
    
    private fun getCountdownText(): String {
        if (nextPrayerTimeMillis == 0L) {
            return "Loading prayer times..."
        }
        
        val now = System.currentTimeMillis()
        val diff = nextPrayerTimeMillis - now
        
        if (diff <= 0) {
            // Current prayer is happening, find next one
            updateNextPrayer()
            return "Prayer time now!"
        }
        
        val hours = diff / (1000 * 60 * 60)
        val minutes = (diff % (1000 * 60 * 60)) / (1000 * 60)
        val seconds = (diff % (1000 * 60)) / 1000
        
        return if (hours > 0) {
            String.format("%dh %dm %ds", hours, minutes, seconds)
        } else if (minutes > 0) {
            String.format("%dm %ds", minutes, seconds)
        } else {
            String.format("%ds", seconds)
        }
    }
    
    private fun startCountdown() {
        updateNextPrayer()
        
        runnable = object : Runnable {
            private var retryCount = 0
            private val maxRetries = 30  // Try for 5 minutes (10s * 30)
            
            override fun run() {
                updateNotification()
                
                // Check if we need to update next prayer
                if (System.currentTimeMillis() >= nextPrayerTimeMillis && nextPrayerTimeMillis > 0) {
                    updateNextPrayer()
                }
                
                // If no prayers loaded, try to reload periodically
                if (prayers.isEmpty() && retryCount < maxRetries) {
                    retryCount++
                    if (retryCount % 10 == 0) { // Every 10 seconds
                        Log.d(TAG, "🔄 Retry loading prayers (attempt $retryCount)")
                        loadPrayersFromPrefs()
                        updateNextPrayer()
                    }
                }
                
                handler?.postDelayed(this, 1000)
            }
        }
        handler?.post(runnable!!)
        Log.d(TAG, "⏱️ Countdown started")
    }
    
    private fun stopCountdown() {
        runnable?.let { handler?.removeCallbacks(it) }
        runnable = null
        Log.d(TAG, "⏱️ Countdown stopped")
    }
    
    private fun updateNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, createNotification())
    }
    
    private fun updateNextPrayer() {
        val now = System.currentTimeMillis()
        val todayCalendar = Calendar.getInstance()
        
        // Find the next prayer that hasn't happened yet
        val upcomingPrayers = prayers.filter { it.adhanMillis > now }
        
        if (upcomingPrayers.isNotEmpty()) {
            val next = upcomingPrayers.first()
            nextPrayerName = next.name
            nextPrayerTimeMillis = next.adhanMillis
            Log.d(TAG, "📿 Next prayer: $nextPrayerName at ${Date(nextPrayerTimeMillis)}")
        } else {
            // All prayers for today have passed, show first prayer for tomorrow
            if (prayers.isNotEmpty()) {
                val first = prayers.first()
                nextPrayerName = first.name + " (Tomorrow)"
                // Add 24 hours to the first prayer time
                nextPrayerTimeMillis = first.adhanMillis + (24 * 60 * 60 * 1000)
                Log.d(TAG, "📿 Next prayer (tomorrow): $nextPrayerName at ${Date(nextPrayerTimeMillis)}")
            } else {
                nextPrayerName = "No prayers loaded"
                nextPrayerTimeMillis = 0L
                Log.w(TAG, "⚠️ No prayers available")
            }
        }
    }
    
    private fun parsePrayers(json: String) {
        try {
            val today = Calendar.getInstance()
            val year = today.get(Calendar.YEAR)
            val month = today.get(Calendar.MONTH)
            val day = today.get(Calendar.DAY_OF_MONTH)
            
            // Simple JSON parsing (avoiding external dependencies)
            val prayerList = mutableListOf<PrayerInfo>()
            
            // Parse JSON array format: [{"name":"Fajr","adhan":"05:30"},...]
            val cleaned = json.trim().removePrefix("[").removeSuffix("]")
            val items = cleaned.split("},").map { it.trim().removePrefix("{").removeSuffix("}") }
            
            for (item in items) {
                if (item.isEmpty()) continue
                
                var name = ""
                var adhanTime = ""
                
                val pairs = item.split(",")
                for (pair in pairs) {
                    val kv = pair.split(":")
                    if (kv.size >= 2) {
                        val key = kv[0].trim().removeSurrounding("\"")
                        val value = if (key == "adhan" && kv.size >= 3) {
                            // Time contains colon, join remaining parts
                            kv.drop(1).joinToString(":").trim().removeSurrounding("\"")
                        } else {
                            kv[1].trim().removeSurrounding("\"")
                        }
                        
                        when (key) {
                            "name" -> name = value
                            "adhan" -> adhanTime = value
                        }
                    }
                }
                
                if (name.isNotEmpty() && adhanTime.isNotEmpty()) {
                    val millis = parseTimeToMillis(adhanTime, year, month, day)
                    prayerList.add(PrayerInfo(name, adhanTime, millis))
                }
            }
            
            prayers = prayerList.sortedBy { it.adhanMillis }
            Log.d(TAG, "📿 Parsed ${prayers.size} prayers: ${prayers.map { it.name }}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to parse prayers JSON", e)
        }
    }
    
    private fun parseTimeToMillis(timeStr: String, year: Int, month: Int, day: Int): Long {
        val cal = Calendar.getInstance()
        cal.set(year, month, day, 0, 0, 0)
        cal.set(Calendar.MILLISECOND, 0)
        
        val t = timeStr.trim()
        var h: Int
        var m: Int
        
        if (t.contains("AM", true) || t.contains("PM", true)) {
            val pts = t.split(" ")
            val hm = pts[0].split(":")
            h = hm[0].toInt()
            m = hm[1].toInt()
            if (pts[1].equals("PM", true) && h != 12) h += 12
            else if (pts[1].equals("AM", true) && h == 12) h = 0
        } else {
            val hm = t.split(":")
            h = hm[0].toInt()
            m = hm[1].toInt()
        }
        
        cal.set(Calendar.HOUR_OF_DAY, h)
        cal.set(Calendar.MINUTE, m)
        
        return cal.timeInMillis
    }
    
    private fun savePrayersToPrefs(json: String) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString("prayers_json", json)
            .putLong("last_update", System.currentTimeMillis())
            .apply()
    }
    
    private fun loadPrayersFromPrefs() {
        Log.d(TAG, "🔍 Loading prayers from SharedPreferences...")
        
        // Try multiple SharedPreferences locations
        val sources = listOf(
            Pair(PREFS_NAME, "prayers_json"),                    // Our own service prefs
            Pair("CapacitorStorage", "today_prayers"),           // Capacitor Preferences storage
            Pair("reliable_alarm_prefs", null)                   // Check if we have stored alarm data
        )
        
        for ((prefsName, key) in sources) {
            try {
                val prefs = getSharedPreferences(prefsName, Context.MODE_PRIVATE)
                
                if (key != null) {
                    val json = prefs.getString(key, null)
                    if (json != null && json.isNotEmpty()) {
                        Log.d(TAG, "📦 Found prayer data in $prefsName/$key")
                        // Parse the Capacitor format which wraps data differently
                        val prayerJson = extractPrayersFromCapacitorFormat(json)
                        if (prayerJson != null) {
                            parsePrayers(prayerJson)
                            if (prayers.isNotEmpty()) {
                                updateNextPrayer()
                                return
                            }
                        }
                    }
                } else {
                    // Load from reliable alarm scheduler
                    val prayerList = mutableListOf<PrayerInfo>()
                    val today = Calendar.getInstance()
                    for (i in 0..4) {
                        val time = prefs.getLong("adhan_$i", 0)
                        val name = prefs.getString("prayer_name_$i", null)
                        if (time > 0 && name != null) {
                            prayerList.add(PrayerInfo(name, "", time))
                        }
                    }
                    if (prayerList.isNotEmpty()) {
                        prayers = prayerList.sortedBy { it.adhanMillis }
                        Log.d(TAG, "📦 Loaded ${prayers.size} prayers from alarm scheduler prefs")
                        updateNextPrayer()
                        return
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load from $prefsName: ${e.message}")
            }
        }
        
        Log.w(TAG, "⚠️ No prayer data found in any SharedPreferences")
    }
    
    private fun extractPrayersFromCapacitorFormat(json: String): String? {
        try {
            // Capacitor Preferences stores as: {"prayers":[...], "date":...}
            if (json.contains("\"prayers\"")) {
                // Extract the prayers array
                val start = json.indexOf("[")
                val end = json.lastIndexOf("]")
                if (start >= 0 && end > start) {
                    return json.substring(start, end + 1)
                }
            }
            // If it's already a plain array
            if (json.trim().startsWith("[")) {
                return json
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract prayers from Capacitor format", e)
        }
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopCountdown()
        Log.d(TAG, "🛑 PrayerCountdownService destroyed")
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
}
