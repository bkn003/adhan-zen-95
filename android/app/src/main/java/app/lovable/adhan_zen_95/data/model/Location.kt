package app.lovable.adhan_zen_95.data.model

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Location entity representing a mosque/location from Supabase.
 * Used for both Room DB (local cache) and Supabase (remote).
 */
@Serializable
@Entity(tableName = "locations")
data class Location(
    @PrimaryKey
    val id: String,
    
    @ColumnInfo(name = "mosque_name")
    @SerialName("mosque_name")
    val mosqueName: String,
    
    val district: String,
    
    val latitude: Double,
    
    val longitude: Double,
    
    @ColumnInfo(name = "women_prayer_hall")
    @SerialName("women_prayer_hall")
    val womenPrayerHall: Boolean? = null,
    
    @ColumnInfo(name = "sahar_food_availability")
    @SerialName("sahar_food_availability")
    val saharFoodAvailability: Boolean? = null,
    
    @ColumnInfo(name = "sahar_food_contact_number")
    @SerialName("sahar_food_contact_number")
    val saharFoodContactNumber: String? = null,
    
    @ColumnInfo(name = "sahar_food_time")
    @SerialName("sahar_food_time")
    val saharFoodTime: String? = null,
    
    @ColumnInfo(name = "created_at")
    @SerialName("created_at")
    val createdAt: String? = null,
    
    @ColumnInfo(name = "updated_at")
    @SerialName("updated_at")
    val updatedAt: String? = null
)
