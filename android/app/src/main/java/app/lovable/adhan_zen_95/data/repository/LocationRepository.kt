package app.lovable.adhan_zen_95.data.repository

import app.lovable.adhan_zen_95.data.local.LocationDao
import app.lovable.adhan_zen_95.data.local.PrayerTimeDao
import app.lovable.adhan_zen_95.data.model.Location
import app.lovable.adhan_zen_95.data.model.PrayerTime
import app.lovable.adhan_zen_95.data.remote.SupabaseConfig
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for Location data.
 * Implements offline-first pattern: fetches from cache, syncs with Supabase.
 */
@Singleton
class LocationRepository @Inject constructor(
    private val locationDao: LocationDao
) {
    
    /**
     * Get all locations with offline-first approach.
     * Returns cached data immediately, then syncs with Supabase.
     */
    fun getAllLocations(): Flow<List<Location>> = flow {
        // First emit cached data
        val cached = locationDao.getAllLocations().first()
        if (cached.isNotEmpty()) {
            emit(cached)
        }
        
        // Then fetch from Supabase and update cache
        try {
            val remote = fetchLocationsFromSupabase()
            if (remote.isNotEmpty()) {
                locationDao.insertAll(remote)
                emit(remote)
            }
        } catch (e: Exception) {
            // If network fails, we still have cached data
            if (cached.isEmpty()) {
                throw e
            }
        }
    }.flowOn(Dispatchers.IO)
    
    /**
     * Get all locations from local cache only (for offline use).
     */
    fun getLocationsFromCache(): Flow<List<Location>> = locationDao.getAllLocations()
    
    /**
     * Get all districts for filtering.
     */
    fun getAllDistricts(): Flow<List<String>> = locationDao.getAllDistricts()
    
    /**
     * Get locations by district.
     */
    fun getLocationsByDistrict(district: String): Flow<List<Location>> = 
        locationDao.getLocationsByDistrict(district)
    
    /**
     * Get a single location by ID.
     */
    suspend fun getLocationById(id: String): Location? = 
        locationDao.getLocationById(id)
    
    /**
     * Fetch locations directly from Supabase.
     */
    private suspend fun fetchLocationsFromSupabase(): List<Location> = withContext(Dispatchers.IO) {
        SupabaseConfig.client.from("locations")
            .select()
            .decodeList<Location>()
    }
    
    /**
     * Force refresh from Supabase.
     */
    suspend fun refreshLocations(): Result<List<Location>> = withContext(Dispatchers.IO) {
        try {
            val locations = fetchLocationsFromSupabase()
            locationDao.deleteAll()
            locationDao.insertAll(locations)
            Result.success(locations)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
