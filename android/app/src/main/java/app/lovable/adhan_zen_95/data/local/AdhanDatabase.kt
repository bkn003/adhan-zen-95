package app.lovable.adhan_zen_95.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import app.lovable.adhan_zen_95.data.model.Location
import app.lovable.adhan_zen_95.data.model.PrayerTime

/**
 * Room Database for the Adhan Zen app.
 * Manages local caching of locations and prayer times.
 */
@Database(
    entities = [Location::class, PrayerTime::class],
    version = 1,
    exportSchema = false
)
abstract class AdhanDatabase : RoomDatabase() {
    
    abstract fun locationDao(): LocationDao
    
    abstract fun prayerTimeDao(): PrayerTimeDao
    
    companion object {
        const val DATABASE_NAME = "adhan_zen_database"
    }
}
