package app.lovable.adhan_zen_95.data.local

import androidx.room.*
import app.lovable.adhan_zen_95.data.model.Location
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for Location entity.
 * Provides reactive queries using Kotlin Flow.
 */
@Dao
interface LocationDao {
    
    @Query("SELECT * FROM locations ORDER BY mosque_name ASC")
    fun getAllLocations(): Flow<List<Location>>
    
    @Query("SELECT * FROM locations WHERE id = :id")
    suspend fun getLocationById(id: String): Location?
    
    @Query("SELECT * FROM locations WHERE id = :id")
    fun getLocationByIdFlow(id: String): Flow<Location?>
    
    @Query("SELECT * FROM locations WHERE district = :district ORDER BY mosque_name ASC")
    fun getLocationsByDistrict(district: String): Flow<List<Location>>
    
    @Query("SELECT DISTINCT district FROM locations ORDER BY district ASC")
    fun getAllDistricts(): Flow<List<String>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(locations: List<Location>)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(location: Location)
    
    @Delete
    suspend fun delete(location: Location)
    
    @Query("DELETE FROM locations")
    suspend fun deleteAll()
    
    @Query("SELECT COUNT(*) FROM locations")
    suspend fun getCount(): Int
}
