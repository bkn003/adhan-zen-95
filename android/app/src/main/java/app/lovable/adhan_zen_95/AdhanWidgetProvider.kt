package app.lovable.adhan_zen_95

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import java.util.*

/**
 * Implementation of App Widget functionality.
 */
class AdhanWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "AdhanWidgetProvider"
        private const val PREFS_NAME = "prayer_countdown_prefs"
        private const val ACTION_UPDATE_WIDGET = "app.lovable.adhan_zen_95.UPDATE_WIDGET"
        
        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, AdhanWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
                ComponentName(context, AdhanWidgetProvider::class.java)
            )
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // There may be multiple widgets active, so update all of them
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_UPDATE_WIDGET) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, AdhanWidgetProvider::class.java)
            )
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_adhan)
        
        // Launch app on click
        val pendingIntent = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        views.setOnClickPendingIntent(R.id.widget_label, pendingIntent)
        views.setOnClickPendingIntent(R.id.widget_prayer_name, pendingIntent)
        views.setOnClickPendingIntent(R.id.widget_prayer_time, pendingIntent)
        
        // Load data
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString("prayers_json", null)
            
            if (json != null) {
                val nextPrayer = getNextPrayer(json)
                if (nextPrayer != null) {
                    views.setTextViewText(R.id.widget_prayer_name, nextPrayer.name)
                    views.setTextViewText(R.id.widget_prayer_time, nextPrayer.time)
                } else {
                    views.setTextViewText(R.id.widget_prayer_name, "Adhan Zen")
                    views.setTextViewText(R.id.widget_prayer_time, "--:--")
                }
            } else {
                views.setTextViewText(R.id.widget_prayer_name, "Adhan Zen")
                views.setTextViewText(R.id.widget_prayer_time, "Open App")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating widget", e)
        }

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    data class PrayerItem(val name: String, val time: String, val millis: Long)
    
    private fun getNextPrayer(json: String): PrayerItem? {
        try {
            val today = Calendar.getInstance()
            val now = System.currentTimeMillis()
            
            val prayerList = mutableListOf<PrayerItem>()
            
            // Simple JSON parsing
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
                    // Filter out Ramadan special times
                    if (name.contains("Sahar") || name.contains("Iftar") || name.contains("Tharaweeh")) continue
                    
                    val millis = parseTimeToMillis(adhanTime)
                    prayerList.add(PrayerItem(name, adhanTime, millis))
                }
            }
            
            val sorted = prayerList.sortedBy { it.millis }
            
            // Find first future prayer
            val next = sorted.firstOrNull { it.millis > now }
            
            if (next != null) {
                return next
            }
            
            // If no future prayer, show first prayer of next day (or just first of today + tomorrow label logic if we had logic for it)
            // For simplicity, wrap around to first of list
            if (sorted.isNotEmpty()) {
                 return sorted.first().copy(name = "${sorted.first().name} (Tom)", time = sorted.first().time)
            }
            
            return null
        } catch (e: Exception) {
            return null
        }
    }
    
    private fun parseTimeToMillis(timeStr: String): Long {
        val cal = Calendar.getInstance()
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
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        
        return cal.timeInMillis
    }
}
