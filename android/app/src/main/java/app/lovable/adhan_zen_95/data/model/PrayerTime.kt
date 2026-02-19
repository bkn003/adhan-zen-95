package app.lovable.adhan_zen_95.data.model

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * PrayerTime entity representing prayer times from Supabase.
 * Contains all 5 daily prayers with Adhan/Iqamah times,
 * plus Jummah and Ramadan-specific times.
 */
@Serializable
@Entity(
    tableName = "prayer_times",
    indices = [Index("location_id")]
)
data class PrayerTime(
    @PrimaryKey
    val id: String,
    
    @ColumnInfo(name = "location_id")
    @SerialName("location_id")
    val locationId: String?,
    
    val month: String,
    
    @ColumnInfo(name = "date_range")
    @SerialName("date_range")
    val dateRange: String,
    
    @ColumnInfo(name = "date_from")
    @SerialName("date_from")
    val dateFrom: String? = null,
    
    @ColumnInfo(name = "date_to")
    @SerialName("date_to")
    val dateTo: String? = null,
    
    // Fajr
    @ColumnInfo(name = "fajr_adhan")
    @SerialName("fajr_adhan")
    val fajrAdhan: String,
    
    @ColumnInfo(name = "fajr_iqamah")
    @SerialName("fajr_iqamah")
    val fajrIqamah: String,
    
    @ColumnInfo(name = "fajr_ramadan_iqamah")
    @SerialName("fajr_ramadan_iqamah")
    val fajrRamadanIqamah: String? = null,
    
    // Dhuhr
    @ColumnInfo(name = "dhuhr_adhan")
    @SerialName("dhuhr_adhan")
    val dhuhrAdhan: String,
    
    @ColumnInfo(name = "dhuhr_iqamah")
    @SerialName("dhuhr_iqamah")
    val dhuhrIqamah: String,
    
    // Asr
    @ColumnInfo(name = "asr_adhan")
    @SerialName("asr_adhan")
    val asrAdhan: String,
    
    @ColumnInfo(name = "asr_iqamah")
    @SerialName("asr_iqamah")
    val asrIqamah: String,
    
    // Maghrib
    @ColumnInfo(name = "maghrib_adhan")
    @SerialName("maghrib_adhan")
    val maghribAdhan: String,
    
    @ColumnInfo(name = "maghrib_iqamah")
    @SerialName("maghrib_iqamah")
    val maghribIqamah: String,
    
    @ColumnInfo(name = "maghrib_ramadan_adhan")
    @SerialName("maghrib_ramadan_adhan")
    val maghribRamadanAdhan: String? = null,
    
    @ColumnInfo(name = "maghrib_ramadan_iqamah")
    @SerialName("maghrib_ramadan_iqamah")
    val maghribRamadanIqamah: String? = null,
    
    // Isha
    @ColumnInfo(name = "isha_adhan")
    @SerialName("isha_adhan")
    val ishaAdhan: String,
    
    @ColumnInfo(name = "isha_iqamah")
    @SerialName("isha_iqamah")
    val ishaIqamah: String,
    
    @ColumnInfo(name = "isha_ramadan_iqamah")
    @SerialName("isha_ramadan_iqamah")
    val ishaRamadanIqamah: String? = null,
    
    // Jummah
    @ColumnInfo(name = "jummah_adhan")
    @SerialName("jummah_adhan")
    val jummahAdhan: String? = null,
    
    @ColumnInfo(name = "jummah_iqamah")
    @SerialName("jummah_iqamah")
    val jummahIqamah: String? = null,
    
    // Ramadan specific
    @ColumnInfo(name = "sahar_end")
    @SerialName("sahar_end")
    val saharEnd: String? = null,
    
    @ColumnInfo(name = "ifthar_time")
    @SerialName("ifthar_time")
    val iftharTime: String? = null,
    
    val tharaweeh: String? = null,
    
    // Sun times
    @ColumnInfo(name = "sun_rise")
    @SerialName("sun_rise")
    val sunRise: String? = null,
    
    @ColumnInfo(name = "sun_set")
    @SerialName("sun_set")
    val sunSet: String? = null,
    
    @ColumnInfo(name = "mid_noon")
    @SerialName("mid_noon")
    val midNoon: String? = null,
    
    @ColumnInfo(name = "created_at")
    @SerialName("created_at")
    val createdAt: String? = null
)
