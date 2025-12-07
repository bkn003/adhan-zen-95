package app.lovable.adhan_zen_95

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.Calendar

class AdhanDailyUpdateReceiver : BroadcastReceiver() {
    companion object {
        private const val REQUEST_CODE = 9999
        
        fun scheduleDailyUpdate(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AdhanDailyUpdateReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            
            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 5)
                set(Calendar.SECOND, 0)
                if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
            }
            
            alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, calendar.timeInMillis, AlarmManager.INTERVAL_DAY, pendingIntent)
            Log.d("AdhanDailyUpdate", "Scheduled daily update at ${calendar.time}")
        }
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("AdhanDailyUpdate", "Daily update triggered")
        Thread { PrayerTimeFetcher.fetchAndUpdatePrayerTimes(context) }.start()
    }
}
