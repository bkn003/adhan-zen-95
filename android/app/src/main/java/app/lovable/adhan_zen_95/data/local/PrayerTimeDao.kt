package app.lovable.adhan_zen_95.data.local

import androidx.room.*
import app.lovable.adhan_zen_95.data.model.PrayerTime
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for PrayerTime entity.
 * Provides reactive queries using Kotlin Flow.
 */
@Dao
interface PrayerTimeDao {
    
    @Query("SELECT * FROM prayer_times WHERE location_id = :locationId")
    fun getPrayerTimesByLocation(locationId: String): Flow<List<PrayerTime>>
    
    @Query("SELECT * FROM prayer_times WHERE location_id = :locationId")
    suspend fun getPrayerTimesByLocationSync(locationId: String): List<PrayerTime>
    
    @Query("""
        SELECT * FROM prayer_times 
        WHERE location_id = :locationId 
        AND date_from IS NOT NULL 
        AND date_to IS NOT NULL
        ORDER BY date_from ASC
    """)
    fun getPrayerTimesWithDateRange(locationId: String): Flow<List<PrayerTime>>
    
    @Query("SELECT * FROM prayer_times WHERE id = :id")
    suspend fun getPrayerTimeById(id: String): PrayerTime?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(prayerTimes: List<PrayerTime>)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(prayerTime: PrayerTime)
    
    @Delete
    suspend fun delete(prayerTime: PrayerTime)
    
    @Query("DELETE FROM prayer_times WHERE location_id = :locationId")
    suspend fun deleteByLocation(locationId: String)
    
    @Query("DELETE FROM prayer_times")
    suspend fun deleteAll()
    
    @Query("SELECT COUNT(*) FROM prayer_times WHERE location_id = :locationId")
    suspend fun getCountByLocation(locationId: String): Int
}
