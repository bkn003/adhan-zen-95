package app.lovable.adhan_zen_95

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
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
    private var lastKnownDay: Int = -1  // Track day for midnight reset
    
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
                
                // Schedule periodic WorkManager to ensure service stays alive
                ServiceRestartWorker.schedulePeriodicRestart(applicationContext)
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
                
                // Schedule periodic WorkManager to ensure service stays alive
                ServiceRestartWorker.schedulePeriodicRestart(applicationContext)
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
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        // Calculate countdown
        val diff = if (nextPrayerTimeMillis > 0) nextPrayerTimeMillis - System.currentTimeMillis() else 0
        val hours = (diff / (1000 * 60 * 60)).coerceAtLeast(0)
        val minutes = ((diff % (1000 * 60 * 60)) / (1000 * 60)).coerceAtLeast(0)
        val seconds = ((diff % (1000 * 60)) / 1000).coerceAtLeast(0)
        
        // Format adhan time
        val adhanTimeText = if (nextPrayerTimeMillis > 0) {
            val sdf = java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault())
            sdf.format(java.util.Date(nextPrayerTimeMillis))
        } else {
            "--:--"
        }
        
        // Create custom notification view
        val customView = android.widget.RemoteViews(packageName, R.layout.notification_countdown)
        customView.setTextViewText(R.id.prayer_name, "$nextPrayerName Prayer")
        customView.setTextViewText(R.id.hours, String.format("%02d", hours))
        customView.setTextViewText(R.id.minutes, String.format("%02d", minutes))
        customView.setTextViewText(R.id.seconds, String.format("%02d", seconds))
        customView.setTextViewText(R.id.adhan_time, adhanTimeText)
        
        // Get prayer-specific color for fallback
        val prayerColor = getPrayerColor(nextPrayerName)
        val countdownText = getCountdownText()
        
        // Get large icon
        val largeIcon = android.graphics.BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(largeIcon)
            .setCustomContentView(customView)
            .setCustomBigContentView(customView)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setColor(prayerColor)
            .setColorized(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setContentIntent(pendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
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
    
    /**
     * Check if a prayer is a regular prayer (not Ramadan-specific).
     * Ramadan-specific times like Sahar End, Iftar, and Tharaweeh should NOT
     * appear in the persistent countdown notification.
     */
    private fun isRegularPrayer(prayerName: String): Boolean {
        val ramadanSpecificNames = listOf("sahar", "iftar", "tharaweeh", "taraweeh", "tarawih")
        val lowerName = prayerName.lowercase()
        return ramadanSpecificNames.none { lowerName.contains(it) }
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
        // Initialize lastKnownDay on start
        lastKnownDay = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
        updateNextPrayer()
        
        runnable = object : Runnable {
            private var retryCount = 0
            private val maxRetries = 30  // Try for 5 minutes (10s * 30)
            
            override fun run() {
                // Midnight detection: check if day has changed
                val currentDay = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
                if (currentDay != lastKnownDay && lastKnownDay != -1) {
                    Log.d(TAG, "🌅 Midnight detected! Day changed from $lastKnownDay to $currentDay")
                    lastKnownDay = currentDay
                    
                    // Reload prayers with new day's date
                    reloadPrayersForNewDay()
                }
                
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
                
                handler?.postDelayed(this, 30000) // SIMPLIFIED: 30 second updates (battery-friendly)
            }
        }
        handler?.post(runnable!!)
        Log.d(TAG, "⏱️ Countdown started")
    }
    
    /**
     * Reload prayers for the new day after midnight.
     * This fixes the issue where countdown gets stuck on "Fajr (Tomorrow)" after midnight.
     * Also reschedules AlarmManager alarms as a backup to AdhanDailyUpdateReceiver.
     */
    private fun reloadPrayersForNewDay() {
        Log.d(TAG, "🔄 Reloading prayers for new day (LAYER 3 RELIABILITY CHECK)...")
        
        // LAYER 3 RELIABILITY: Verify daily update alarm is scheduled
        try {
            if (!AdhanDailyUpdateReceiver.isDailyUpdateScheduled(applicationContext)) {
                Log.w(TAG, "⚠️ LAYER 3: Daily update alarm NOT scheduled! Re-scheduling...")
                AdhanDailyUpdateReceiver.scheduleDailyUpdate(applicationContext)
            } else {
                Log.d(TAG, "✅ LAYER 3: Daily update alarm is scheduled")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to check/schedule daily update", e)
        }
        
        // CRITICAL: Also reschedule AlarmManager alarms for the new day
        // This provides redundancy if AdhanDailyUpdateReceiver fails
        try {
            Log.d(TAG, "⏰ LAYER 3: Rescheduling alarms from countdown service (redundancy)...")
            ReliableAlarmScheduler.rescheduleForNewDay(applicationContext)
            DndScheduler.rescheduleForNewDay(applicationContext)
            Log.d(TAG, "✅ LAYER 3: Alarms rescheduled from countdown service")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to reschedule alarms from countdown service", e)
        }

        
        // Re-parse existing prayer times with today's date
        if (prayers.isNotEmpty()) {
            val today = Calendar.getInstance()
            val year = today.get(Calendar.YEAR)
            val month = today.get(Calendar.MONTH)
            val day = today.get(Calendar.DAY_OF_MONTH)
            
            // Recalculate prayer times for today
            val updatedPrayers = prayers.map { prayer ->
                // Re-parse the time string with today's date
                val newMillis = if (prayer.adhanTime.isNotEmpty()) {
                    parseTimeToMillis(prayer.adhanTime, year, month, day)
                } else {
                    val cal = Calendar.getInstance()
                    cal.set(year, month, day)
                    // Keep same hour/minute from old millis
                    val oldCal = Calendar.getInstance()
                    oldCal.timeInMillis = prayer.adhanMillis
                    cal.set(Calendar.HOUR_OF_DAY, oldCal.get(Calendar.HOUR_OF_DAY))
                    cal.set(Calendar.MINUTE, oldCal.get(Calendar.MINUTE))
                    cal.set(Calendar.SECOND, 0)
                    cal.set(Calendar.MILLISECOND, 0)
                    cal.timeInMillis
                }
                
                // Remove "(Tomorrow)" suffix if present
                val cleanName = prayer.name.replace(" (Tomorrow)", "")
                PrayerInfo(cleanName, prayer.adhanTime, newMillis)
            }.sortedBy { it.adhanMillis }
            
            prayers = updatedPrayers
            Log.d(TAG, "📿 Reloaded ${prayers.size} prayers for today: ${prayers.map { "${it.name}@${Date(it.adhanMillis)}" }}")
        } else {
            // Try loading from prefs if we don't have any prayers
            loadPrayersFromPrefs()
        }
        
        updateNextPrayer()
        updateNotification()
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
    
    /**
     * Normalize prayer name based on current day of week.
     * If today is NOT Friday, replace "Jummah" with "Dhuhr"/"Zuhr".
     * This fixes the bug where cached Friday data shows "Jummah" on Saturday.
     */
    private fun normalizePrayerName(name: String): String {
        val isFriday = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY
        
        // If today is NOT Friday, replace Jummah with Zuhr
        return if (!isFriday && name.contains("Jummah", ignoreCase = true)) {
            name.replace("Jummah", "Zuhr", ignoreCase = true)
        } else {
            name
        }
    }
    
    private fun updateNextPrayer() {
        val now = System.currentTimeMillis()
        val todayCalendar = Calendar.getInstance()
        
        // Filter out Ramadan-specific prayers (Sahar End, Iftar, Tharaweeh)
        // Only show regular prayers in the countdown notification
        val regularPrayers = prayers.filter { isRegularPrayer(it.name) }
        
        // Find the next regular prayer that hasn't happened yet
        val upcomingPrayers = regularPrayers.filter { it.adhanMillis > now }
        
        if (upcomingPrayers.isNotEmpty()) {
            val next = upcomingPrayers.first()
            // CRITICAL FIX: Normalize the prayer name for display
            nextPrayerName = normalizePrayerName(next.name)
            nextPrayerTimeMillis = next.adhanMillis
            Log.d(TAG, "📿 Next prayer: $nextPrayerName at ${Date(nextPrayerTimeMillis)}")
        } else {
            // All prayers for today have passed, show first regular prayer for tomorrow
            if (regularPrayers.isNotEmpty()) {
                val first = regularPrayers.first()
                // Normalize name and add (Tomorrow) suffix
                nextPrayerName = normalizePrayerName(first.name) + " (Tomorrow)"
                // Add 24 hours to the first prayer time
                nextPrayerTimeMillis = first.adhanMillis + (24 * 60 * 60 * 1000)
                Log.d(TAG, "📿 Next prayer (tomorrow): $nextPrayerName at ${Date(nextPrayerTimeMillis)}")
            } else {
                nextPrayerName = "No prayers loaded"
                nextPrayerTimeMillis = 0L
                Log.w(TAG, "⚠️ No prayers available")
            }
        }
        
        // Update widget whenever we recalculate next prayer
        AdhanWidgetProvider.updateAllWidgets(applicationContext)
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
                    // CRITICAL: Normalize the prayer name to handle Jummah→Zuhr on non-Friday
                    val normalizedName = normalizePrayerName(name)
                    prayerList.add(PrayerInfo(normalizedName, adhanTime, millis))
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
            
        // Update widget with new data
        AdhanWidgetProvider.updateAllWidgets(applicationContext)
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
                        val rawName = prefs.getString("prayer_name_$i", null)
                        if (time > 0 && rawName != null) {
                            // CRITICAL: Normalize the prayer name to handle Jummah→Zuhr on non-Friday
                            val name = normalizePrayerName(rawName)
                            prayerList.add(PrayerInfo(name, "", time))
                        }
                    }
                    if (prayerList.isNotEmpty()) {
                        prayers = prayerList.sortedBy { it.adhanMillis }
                        Log.d(TAG, "📦 Loaded ${prayers.size} prayers from alarm scheduler prefs (normalized names)")
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
    
    /**
     * Called when user swipes away the app from recent apps.
     * SIMPLIFIED: Only use WorkManager for restart (battery-friendly like native Clock app)
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "📱 App killed by user - scheduling WorkManager restart...")
        
        // SIMPLIFIED: Only WorkManager restart (battery-friendly)
        // Alarms scheduled via setAlarmClock don't need a running service
        try {
            ServiceRestartWorker.triggerImmediateRestart(applicationContext)
            Log.d(TAG, "✅ WorkManager restart triggered")
        } catch (e: Exception) {
            Log.e(TAG, "❌ WorkManager restart failed", e)
        }
        
        super.onTaskRemoved(rootIntent)
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
}
