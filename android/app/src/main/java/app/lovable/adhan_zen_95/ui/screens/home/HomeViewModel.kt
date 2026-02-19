package app.lovable.adhan_zen_95.ui.screens.home

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.lovable.adhan_zen_95.DndScheduler
import app.lovable.adhan_zen_95.PrayerCountdownService
import app.lovable.adhan_zen_95.PrayerTimeFetcher
import app.lovable.adhan_zen_95.ReliableAlarmScheduler
import app.lovable.adhan_zen_95.data.model.Location
import app.lovable.adhan_zen_95.data.model.PrayerTime
import app.lovable.adhan_zen_95.data.repository.LocationRepository
import app.lovable.adhan_zen_95.data.repository.PrayerTimeRepository
import androidx.core.content.ContextCompat
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Calendar
import javax.inject.Inject

/**
 * UI state for the Home screen.
 */
data class HomeUiState(
    val isLoading: Boolean = true,
    val locations: List<Location> = emptyList(),
    val selectedLocation: Location? = null,
    val prayerTimes: List<PrayerInfo> = emptyList(),
    val nextPrayer: PrayerInfo? = null,
    val timeUntilNext: String = "",
    val currentDate: LocalDate = LocalDate.now(),
    val isRamadan: Boolean = false,
    val error: String? = null,
    val rawPrayerTime: PrayerTime? = null
)

/**
 * Simplified prayer info for UI display.
 */
data class PrayerInfo(
    val name: String,
    val nameTamil: String,
    val adhanTime: String,
    val iqamahTime: String,
    val isPassed: Boolean = false,
    val isNext: Boolean = false,
    val type: PrayerType
)

enum class PrayerType {
    FAJR, DHUHR, ASR, MAGHRIB, ISHA, JUMMAH, SAHAR, IFTAR, THARAWEEH
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val locationRepository: LocationRepository,
    private val prayerTimeRepository: PrayerTimeRepository
) : ViewModel() {
    
    companion object {
        private const val TAG = "HomeViewModel"
    }
    
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()
    
    private val selectedLocationId = MutableStateFlow<String?>(null)
    
    init {
        loadLocations()
        startCountdownTimer()
    }
    
    private fun loadLocations() {
        viewModelScope.launch {
            try {
                locationRepository.getAllLocations().collect { locations ->
                    _uiState.update { it.copy(locations = locations, isLoading = false) }
                    
                    // Auto-select first location if none selected
                    if (_uiState.value.selectedLocation == null && locations.isNotEmpty()) {
                        selectLocation(locations.first())
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load locations", e)
                _uiState.update { it.copy(error = e.message, isLoading = false) }
            }
        }
    }
    
    fun selectLocation(location: Location) {
        _uiState.update { it.copy(selectedLocation = location) }
        selectedLocationId.value = location.id
        
        // Save location to native system for background operations
        try {
            PrayerTimeFetcher.saveSelectedLocation(context, location.id)
            Log.d(TAG, "✅ Selected location: ${location.mosqueName}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save location", e)
        }
        
        loadPrayerTimes(location.id)
    }
    
    private fun loadPrayerTimes(locationId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                prayerTimeRepository.getPrayerTimesByLocation(locationId).collect { prayerTimes ->
                    val todayPrayer = findTodayPrayerTime(prayerTimes)
                    if (todayPrayer != null) {
                        val prayers = convertToPrayerInfoList(todayPrayer)
                        val nextPrayer = findNextPrayer(prayers)
                        
                        _uiState.update { 
                            it.copy(
                                prayerTimes = prayers,
                                nextPrayer = nextPrayer,
                                rawPrayerTime = todayPrayer,
                                isLoading = false
                            ) 
                        }
                        
                        // Schedule alarms and DND for today's prayers
                        scheduleAlarmsForToday(todayPrayer, prayers)
                        updateCountdownService(prayers)
                    } else {
                        _uiState.update { it.copy(isLoading = false) }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load prayer times", e)
                _uiState.update { it.copy(error = e.message, isLoading = false) }
            }
        }
    }
    
    /**
     * Schedule Adhan alarms and DND for today's prayers.
     */
    private fun scheduleAlarmsForToday(pt: PrayerTime, prayers: List<PrayerInfo>) {
        try {
            val now = System.currentTimeMillis()
            val cal = Calendar.getInstance()
            val year = cal.get(Calendar.YEAR)
            val month = cal.get(Calendar.MONTH)
            val day = cal.get(Calendar.DAY_OF_MONTH)
            
            val prefs = context.getSharedPreferences("dnd_user_settings", Context.MODE_PRIVATE)
            val dndEnabled = prefs.getBoolean("dnd_enabled", true)
            val dndBefore = prefs.getInt("dnd_minutes_before", 5)
            val dndAfter = prefs.getInt("dnd_minutes_after", 15)
            
            val prayerData = listOf(
                Triple("Fajr", pt.fajrAdhan, pt.fajrIqamah),
                Triple("Dhuhr", pt.dhuhrAdhan, pt.dhuhrIqamah),
                Triple("Asr", pt.asrAdhan, pt.asrIqamah),
                Triple("Maghrib", pt.maghribAdhan, pt.maghribIqamah),
                Triple("Isha", pt.ishaAdhan, pt.ishaIqamah)
            )
            
            prayerData.forEachIndexed { index, (name, adhan, iqamah) ->
                val adhanMillis = parseTimeToMillis(adhan, year, month, day)
                val iqamahMillis = parseTimeToMillis(iqamah, year, month, day)
                
                // Schedule Adhan alarm if in the future
                if (adhanMillis > now) {
                    ReliableAlarmScheduler.scheduleAdhanAlarm(
                        context, adhanMillis, name, index, iqamahMillis, adhan, iqamah
                    )
                    Log.d(TAG, "📅 Scheduled Adhan: $name at $adhan")
                }
                
                // Schedule DND if enabled
                if (dndEnabled && iqamahMillis > now) {
                    val prayerDndKey = "dnd_${name.lowercase()}"
                    val prayerDndEnabled = prefs.getBoolean(prayerDndKey, true)
                    
                    if (prayerDndEnabled) {
                        DndScheduler.scheduleDndForPrayer(
                            context, iqamahMillis, name, index, dndBefore, dndAfter, iqamah
                        )
                        Log.d(TAG, "🔕 Scheduled DND: $name at $iqamah")
                    }
                }
            }
            
            Log.d(TAG, "✅ All alarms scheduled for today")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule alarms", e)
        }
    }
    
    /**
     * Update the countdown service with today's prayers.
     */
    private fun updateCountdownService(prayers: List<PrayerInfo>) {
        try {
            val jsonBuilder = StringBuilder("[")
            prayers.forEachIndexed { index, prayer ->
                if (index > 0) jsonBuilder.append(",")
                jsonBuilder.append("{")
                jsonBuilder.append("\"name\":\"${prayer.name}\",")
                jsonBuilder.append("\"adhan\":\"${prayer.adhanTime}\"")
                jsonBuilder.append("}")
            }
            jsonBuilder.append("]")
            
            val serviceIntent = Intent(context, PrayerCountdownService::class.java).apply {
                action = PrayerCountdownService.ACTION_UPDATE_PRAYERS
                putExtra(PrayerCountdownService.EXTRA_PRAYERS_JSON, jsonBuilder.toString())
            }
            ContextCompat.startForegroundService(context, serviceIntent)
            
            Log.d(TAG, "✅ Updated countdown service with ${prayers.size} prayers")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to update countdown service", e)
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
            m = hm.getOrElse(1) { "0" }.toInt()
        }
        
        cal.set(Calendar.HOUR_OF_DAY, h)
        cal.set(Calendar.MINUTE, m)
        return cal.timeInMillis
    }
    
    private fun findTodayPrayerTime(times: List<PrayerTime>): PrayerTime? {
        val today = LocalDate.now()
        return times.find { pt ->
            val dateFrom = pt.dateFrom?.let { parseDate(it) }
            val dateTo = pt.dateTo?.let { parseDate(it) }
            if (dateFrom != null && dateTo != null) {
                !today.isBefore(dateFrom) && !today.isAfter(dateTo)
            } else false
        } ?: times.firstOrNull()
    }
    
    private fun parseDate(dateStr: String): LocalDate? {
        return try {
            if (dateStr.contains("-") && dateStr.length <= 6) {
                val parts = dateStr.split("-")
                val day = parts[0].toInt()
                val month = parseMonth(parts[1])
                LocalDate.of(LocalDate.now().year, month, day)
            } else {
                LocalDate.parse(dateStr)
            }
        } catch (e: Exception) { null }
    }
    
    private fun parseMonth(monthStr: String): Int = when (monthStr.lowercase()) {
        "jan" -> 1; "feb" -> 2; "mar" -> 3; "apr" -> 4
        "may" -> 5; "jun" -> 6; "jul" -> 7; "aug" -> 8
        "sep" -> 9; "oct" -> 10; "nov" -> 11; "dec" -> 12
        else -> 1
    }
    
    private fun convertToPrayerInfoList(pt: PrayerTime): List<PrayerInfo> {
        val now = LocalTime.now()
        val isFriday = LocalDate.now().dayOfWeek.value == 5
        
        val prayers = mutableListOf<PrayerInfo>()
        
        prayers.add(createPrayerInfo("Fajr", "ஃபஜ்ர்", pt.fajrAdhan, pt.fajrIqamah, PrayerType.FAJR, now))
        
        if (isFriday && pt.jummahAdhan != null) {
            prayers.add(createPrayerInfo("Jummah", "ஜுமுஆ", pt.jummahAdhan, pt.jummahIqamah ?: "", PrayerType.JUMMAH, now))
        } else {
            prayers.add(createPrayerInfo("Dhuhr", "ளுஹர்", pt.dhuhrAdhan, pt.dhuhrIqamah, PrayerType.DHUHR, now))
        }
        
        prayers.add(createPrayerInfo("Asr", "அஸர்", pt.asrAdhan, pt.asrIqamah, PrayerType.ASR, now))
        prayers.add(createPrayerInfo("Maghrib", "மஃக்ரிப்", pt.maghribAdhan, pt.maghribIqamah, PrayerType.MAGHRIB, now))
        prayers.add(createPrayerInfo("Isha", "இஷா", pt.ishaAdhan, pt.ishaIqamah, PrayerType.ISHA, now))
        
        return prayers
    }
    
    private fun createPrayerInfo(
        name: String,
        nameTamil: String,
        adhan: String,
        iqamah: String,
        type: PrayerType,
        now: LocalTime
    ): PrayerInfo {
        val adhanTime = parseTime(adhan)
        val isPassed = adhanTime?.let { now.isAfter(it) } ?: false
        
        return PrayerInfo(
            name = name,
            nameTamil = nameTamil,
            adhanTime = adhan,
            iqamahTime = iqamah,
            isPassed = isPassed,
            type = type
        )
    }
    
    private fun parseTime(timeStr: String): LocalTime? {
        return try {
            val cleaned = timeStr.trim().uppercase()
            when {
                cleaned.contains("AM") || cleaned.contains("PM") -> {
                    LocalTime.parse(cleaned, DateTimeFormatter.ofPattern("hh:mm a"))
                }
                else -> LocalTime.parse(cleaned, DateTimeFormatter.ofPattern("HH:mm"))
            }
        } catch (e: Exception) { null }
    }
    
    private fun findNextPrayer(prayers: List<PrayerInfo>): PrayerInfo? {
        return prayers.firstOrNull { !it.isPassed } ?: prayers.firstOrNull()
    }
    
    private fun startCountdownTimer() {
        viewModelScope.launch {
            while (true) {
                updateCountdown()
                kotlinx.coroutines.delay(1000)
            }
        }
    }
    
    private fun updateCountdown() {
        val nextPrayer = _uiState.value.nextPrayer ?: return
        val adhanTime = parseTime(nextPrayer.adhanTime) ?: return
        val now = LocalTime.now()
        
        val seconds = now.until(adhanTime, ChronoUnit.SECONDS)
        if (seconds < 0) {
            // Prayer time passed, reload
            _uiState.value.selectedLocation?.let { loadPrayerTimes(it.id) }
            return
        }
        
        val hours = seconds / 3600
        val mins = (seconds % 3600) / 60
        val secs = seconds % 60
        
        val countdown = if (hours > 0) {
            String.format("%02d:%02d:%02d", hours, mins, secs)
        } else {
            String.format("%02d:%02d", mins, secs)
        }
        
        _uiState.update { it.copy(timeUntilNext = countdown) }
    }
    
    fun toggleRamadan() {
        _uiState.update { it.copy(isRamadan = !it.isRamadan) }
    }
}
