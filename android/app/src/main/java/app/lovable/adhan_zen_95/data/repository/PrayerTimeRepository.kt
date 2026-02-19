package app.lovable.adhan_zen_95.data.repository

import app.lovable.adhan_zen_95.data.local.PrayerTimeDao
import app.lovable.adhan_zen_95.data.model.PrayerTime
import app.lovable.adhan_zen_95.data.remote.SupabaseConfig
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for PrayerTime data.
 * Implements offline-first pattern: fetches from cache, syncs with Supabase.
 */
@Singleton
class PrayerTimeRepository @Inject constructor(
    private val prayerTimeDao: PrayerTimeDao
) {
    
    /**
     * Get prayer times for a location with offline-first approach.
     */
    fun getPrayerTimesByLocation(locationId: String): Flow<List<PrayerTime>> = flow {
        // First emit cached data
        val cached = prayerTimeDao.getPrayerTimesByLocation(locationId).first()
        if (cached.isNotEmpty()) {
            emit(cached)
        }
        
        // Then fetch from Supabase and update cache
        try {
            val remote = fetchPrayerTimesFromSupabase(locationId)
            if (remote.isNotEmpty()) {
                prayerTimeDao.deleteByLocation(locationId)
                prayerTimeDao.insertAll(remote)
                emit(remote)
            }
        } catch (e: Exception) {
            if (cached.isEmpty()) {
                throw e
            }
        }
    }.flowOn(Dispatchers.IO)
    
    /**
     * Get prayer times from cache only.
     */
    fun getPrayerTimesFromCache(locationId: String): Flow<List<PrayerTime>> = 
        prayerTimeDao.getPrayerTimesByLocation(locationId)
    
    /**
     * Fetch prayer times directly from Supabase.
     */
    private suspend fun fetchPrayerTimesFromSupabase(locationId: String): List<PrayerTime> = 
        withContext(Dispatchers.IO) {
            SupabaseConfig.client.from("prayer_times")
                .select {
                    filter {
                        eq("location_id", locationId)
                    }
                }
                .decodeList<PrayerTime>()
        }
    
    /**
     * Force refresh prayer times from Supabase.
     */
    suspend fun refreshPrayerTimes(locationId: String): Result<List<PrayerTime>> = 
        withContext(Dispatchers.IO) {
            try {
                val prayerTimes = fetchPrayerTimesFromSupabase(locationId)
                prayerTimeDao.deleteByLocation(locationId)
                prayerTimeDao.insertAll(prayerTimes)
                Result.success(prayerTimes)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    
    /**
     * Get prayer times for today based on date range.
     * Filters cached prayer times to find the one matching today's date.
     */
    suspend fun getPrayerTimesForToday(locationId: String): PrayerTime? = 
        withContext(Dispatchers.IO) {
            val allTimes = prayerTimeDao.getPrayerTimesByLocationSync(locationId)
            val today = java.time.LocalDate.now()
            
            allTimes.find { prayerTime ->
                val dateFrom = prayerTime.dateFrom?.let { parseDate(it) }
                val dateTo = prayerTime.dateTo?.let { parseDate(it) }
                
                if (dateFrom != null && dateTo != null) {
                    !today.isBefore(dateFrom) && !today.isAfter(dateTo)
                } else {
                    false
                }
            }
        }
    
    private fun parseDate(dateStr: String): java.time.LocalDate? {
        return try {
            // Handle formats like "01-Dec" or "2024-12-01"
            if (dateStr.contains("-") && dateStr.length <= 6) {
                // Format: "01-Dec"
                val parts = dateStr.split("-")
                val day = parts[0].toInt()
                val month = parseMonth(parts[1])
                val year = java.time.LocalDate.now().year
                java.time.LocalDate.of(year, month, day)
            } else {
                java.time.LocalDate.parse(dateStr)
            }
        } catch (e: Exception) {
            null
        }
    }
    
    private fun parseMonth(monthStr: String): Int {
        return when (monthStr.lowercase()) {
            "jan" -> 1
            "feb" -> 2
            "mar" -> 3
            "apr" -> 4
            "may" -> 5
            "jun" -> 6
            "jul" -> 7
            "aug" -> 8
            "sep" -> 9
            "oct" -> 10
            "nov" -> 11
            "dec" -> 12
            else -> 1
        }
    }
}
