package app.lovable.adhan_zen_95

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalTime
import java.time.temporal.ChronoUnit
import java.util.Calendar

// ============= COLORS =============
val Emerald50 = Color(0xFFECFDF5)
val Emerald100 = Color(0xFFD1FAE5)
val Emerald600 = Color(0xFF059669)
val Slate100 = Color(0xFFF1F5F9)
val Slate300 = Color(0xFFCBD5E1)
val Slate500 = Color(0xFF64748B)
val Slate700 = Color(0xFF334155)
val Slate800 = Color(0xFF1E293B)

val FajrColor = Color(0xFF3B82F6)
val DhuhrColor = Color(0xFFF59E0B)
val AsrColor = Color(0xFF8B5CF6)
val MaghribColor = Color(0xFFEF4444)
val IshaColor = Color(0xFF1E3A8A)

// ============= DATA CLASSES =============
data class MosqueLocation(val id: String, val name: String, val district: String, val lat: Double, val lon: Double)
data class Prayer(val name: String, val tamil: String, val adhan: String, val iqamah: String, val color: Color)

// ============= NETWORK HELPER (Same as PrayerTimeFetcher) =============
object SupabaseApi {
    private const val TAG = "SupabaseApi"
    private const val BASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co/rest/v1"
    private const val API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxodWZxbm9rbWRxa3Z6Y3hxd2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTIwMzksImV4cCI6MjA3MzIyODAzOX0.FHokW4gosyE7KuGowCtaGPBO-v7hxlh63lM6kRofwu4"
    
    fun fetchLocations(): List<MosqueLocation> {
        Log.d(TAG, "📡 Fetching locations...")
        val result = mutableListOf<MosqueLocation>()
        var conn: HttpURLConnection? = null
        try {
            val url = URL("$BASE_URL/locations?select=*")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("apikey", API_KEY)
            conn.setRequestProperty("Authorization", "Bearer $API_KEY")
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            
            Log.d(TAG, "📡 Response code: ${conn.responseCode}")
            
            if (conn.responseCode == 200) {
                val response = BufferedReader(InputStreamReader(conn.inputStream)).readText()
                val json = JSONArray(response)
                
                for (i in 0 until json.length()) {
                    val obj = json.getJSONObject(i)
                    result.add(MosqueLocation(
                        obj.getString("id"),
                        obj.getString("mosque_name"),
                        obj.getString("district"),
                        obj.getDouble("latitude"),
                        obj.getDouble("longitude")
                    ))
                }
                Log.d(TAG, "✅ Loaded ${result.size} locations")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error fetching locations: ${e.message}", e)
        } finally {
            conn?.disconnect()
        }
        return result
    }
    
    fun fetchPrayerTimes(locationId: String): List<Prayer> {
        Log.d(TAG, "📡 Fetching prayer times for $locationId...")
        var conn: HttpURLConnection? = null
        try {
            val today = Calendar.getInstance()
            val monthName = getMonthName(today.get(Calendar.MONTH))
            val currentDay = today.get(Calendar.DAY_OF_MONTH)
            val isFriday = today.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY
            
            val url = URL("$BASE_URL/prayer_times?location_id=eq.$locationId&month=eq.$monthName&select=*")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("apikey", API_KEY)
            conn.setRequestProperty("Authorization", "Bearer $API_KEY")
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            
            if (conn.responseCode == 200) {
                val response = BufferedReader(InputStreamReader(conn.inputStream)).readText()
                val json = JSONArray(response)
                
                // Find matching date range
                for (i in 0 until json.length()) {
                    val record = json.getJSONObject(i)
                    val dateRange = record.optString("date_range", "")
                    val rangeMatch = Regex("(\\d+)-(\\d+)").find(dateRange)
                    
                    if (rangeMatch != null) {
                        val startDay = rangeMatch.groupValues[1].toInt()
                        val endDay = rangeMatch.groupValues[2].toInt()
                        
                        if (currentDay in startDay..endDay) {
                            Log.d(TAG, "✅ Found matching date range: $dateRange")
                            return listOf(
                                Prayer("Fajr", "ஃபஜ்ர்", record.getString("fajr_adhan"), record.getString("fajr_iqamah"), FajrColor),
                                Prayer(
                                    if (isFriday) "Jummah" else "Dhuhr",
                                    if (isFriday) "ஜுமுஆ" else "ளுஹர்",
                                    if (isFriday && record.has("jummah_adhan")) record.getString("jummah_adhan") else record.getString("dhuhr_adhan"),
                                    if (isFriday && record.has("jummah_iqamah")) record.getString("jummah_iqamah") else record.getString("dhuhr_iqamah"),
                                    DhuhrColor
                                ),
                                Prayer("Asr", "அஸர்", record.getString("asr_adhan"), record.getString("asr_iqamah"), AsrColor),
                                Prayer("Maghrib", "மஃக்ரிப்", record.getString("maghrib_adhan"), record.getString("maghrib_iqamah"), MaghribColor),
                                Prayer("Isha", "இஷா", record.getString("isha_adhan"), record.getString("isha_iqamah"), IshaColor)
                            )
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error fetching prayer times: ${e.message}", e)
        } finally {
            conn?.disconnect()
        }
        return emptyList()
    }
    
    private fun getMonthName(month: Int): String = when (month) {
        0 -> "January"; 1 -> "February"; 2 -> "March"; 3 -> "April"; 4 -> "May"; 5 -> "June"
        6 -> "July"; 7 -> "August"; 8 -> "September"; 9 -> "October"; 10 -> "November"; 11 -> "December"
        else -> "January"
    }
}

// ============= VIEW MODEL =============
class HomeViewModel : ViewModel() {
    private val _locations = MutableStateFlow<List<MosqueLocation>>(emptyList())
    val locations: StateFlow<List<MosqueLocation>> = _locations
    
    private val _selectedLocation = MutableStateFlow<MosqueLocation?>(null)
    val selectedLocation: StateFlow<MosqueLocation?> = _selectedLocation
    
    private val _prayers = MutableStateFlow<List<Prayer>>(getStaticPrayers())
    val prayers: StateFlow<List<Prayer>> = _prayers
    
    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading
    
    private val _dataSource = MutableStateFlow("Loading...")
    val dataSource: StateFlow<String> = _dataSource
    
    init {
        loadLocations()
    }
    
    private fun loadLocations() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val locs = withContext(Dispatchers.IO) { SupabaseApi.fetchLocations() }
                if (locs.isNotEmpty()) {
                    _locations.value = locs
                    selectLocation(locs.first())
                    _dataSource.value = "✓ Online"
                } else {
                    _dataSource.value = "Offline"
                }
            } catch (e: Exception) {
                Log.e("HomeViewModel", "Error loading locations", e)
                _dataSource.value = "Error"
            }
            _isLoading.value = false
        }
    }
    
    fun selectLocation(location: MosqueLocation) {
        _selectedLocation.value = location
        loadPrayerTimes(location.id)
    }
    
    private fun loadPrayerTimes(locationId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val pts = withContext(Dispatchers.IO) { SupabaseApi.fetchPrayerTimes(locationId) }
                if (pts.isNotEmpty()) {
                    _prayers.value = pts
                    _dataSource.value = "✓ Synced"
                }
            } catch (e: Exception) {
                Log.e("HomeViewModel", "Error loading prayer times", e)
            }
            _isLoading.value = false
        }
    }
    
    private fun getStaticPrayers() = listOf(
        Prayer("Fajr", "ஃபஜ்ர்", "05:30 AM", "05:45 AM", FajrColor),
        Prayer("Dhuhr", "ளுஹர்", "12:30 PM", "12:45 PM", DhuhrColor),
        Prayer("Asr", "அஸர்", "04:00 PM", "04:15 PM", AsrColor),
        Prayer("Maghrib", "மஃக்ரிப்", "06:15 PM", "06:20 PM", MaghribColor),
        Prayer("Isha", "இஷா", "07:45 PM", "08:00 PM", IshaColor)
    )
}

// ============= MAIN ACTIVITY =============
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d("MainActivity", "🚀 Starting Native App with Network")
        
        try { enableEdgeToEdge() } catch (e: Exception) { }
        
        // Initialize alarm system
        try {
            AdhanInitializer.initializeIfNeeded(this)
            AdhanDailyUpdateReceiver.scheduleDailyUpdate(this)
            AlarmHealthWorker.schedule(this)
        } catch (e: Exception) {
            Log.e("MainActivity", "Alarm init failed", e)
        }
        
        setContent {
            MaterialTheme {
                AdhanApp()
            }
        }
    }
}

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Home : Screen("home", "Home", Icons.Filled.Home)
    object Nearby : Screen("nearby", "Nearby", Icons.Filled.NearMe)
    object Qibla : Screen("qibla", "Qibla", Icons.Filled.Explore)
    object Qaza : Screen("qaza", "Qaza", Icons.Filled.Checklist)
    object Settings : Screen("settings", "Settings", Icons.Filled.Settings)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdhanApp() {
    val navController = rememberNavController()
    
    Scaffold(bottomBar = { BottomNav(navController) }) { padding ->
        NavHost(navController, Screen.Home.route, Modifier.padding(padding)) {
            composable(Screen.Home.route) { HomeScreen() }
            composable(Screen.Nearby.route) { NearbyScreen() }
            composable(Screen.Qibla.route) { QiblaScreen() }
            composable(Screen.Qaza.route) { QazaScreen() }
            composable(Screen.Settings.route) { SettingsScreen() }
        }
    }
}

@Composable
fun BottomNav(navController: NavHostController) {
    val items = listOf(Screen.Home, Screen.Nearby, Screen.Qibla, Screen.Qaza, Screen.Settings)
    val current by navController.currentBackStackEntryAsState()
    val currentRoute = current?.destination?.route
    
    NavigationBar(containerColor = Color.White) {
        items.forEach { screen ->
            NavigationBarItem(
                icon = { Icon(screen.icon, screen.title) },
                label = { Text(screen.title, fontSize = 11.sp) },
                selected = currentRoute == screen.route,
                onClick = { navController.navigate(screen.route) { popUpTo(navController.graph.startDestinationId); launchSingleTop = true } },
                colors = NavigationBarItemDefaults.colors(selectedIconColor = Emerald600, selectedTextColor = Emerald600, indicatorColor = Emerald100)
            )
        }
    }
}

// ============= HOME SCREEN =============
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(viewModel: HomeViewModel = viewModel()) {
    val locations by viewModel.locations.collectAsState()
    val selectedLocation by viewModel.selectedLocation.collectAsState()
    val prayers by viewModel.prayers.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val dataSource by viewModel.dataSource.collectAsState()
    
    var expanded by remember { mutableStateOf(false) }
    var countdown by remember { mutableStateOf("--:--") }
    
    val nextPrayer = prayers.firstOrNull { !isPassed(it.adhan) } ?: prayers.firstOrNull()
    
    // Countdown timer
    LaunchedEffect(nextPrayer) {
        while (true) {
            nextPrayer?.let {
                val target = parseTime(it.adhan)
                if (target != null) {
                    val secs = LocalTime.now().until(target, ChronoUnit.SECONDS)
                    countdown = if (secs > 0) {
                        val h = secs / 3600; val m = (secs % 3600) / 60; val s = secs % 60
                        if (h > 0) String.format("%02d:%02d:%02d", h, m, s) else String.format("%02d:%02d", m, s)
                    } else "--:--"
                }
            }
            delay(1000)
        }
    }
    
    LazyColumn(
        Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Emerald50, Color.White))),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Data source indicator
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (dataSource.contains("✓")) Icons.Default.CloudDone else Icons.Default.CloudOff,
                    null,
                    tint = if (dataSource.contains("✓")) Emerald600 else Slate500,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text(dataSource, fontSize = 12.sp, color = Slate500)
            }
        }
        
        // Location Selector
        if (locations.isNotEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(12.dp)) {
                    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                        OutlinedTextField(
                            value = selectedLocation?.name ?: "Select Location",
                            onValueChange = {},
                            readOnly = true,
                            leadingIcon = { Icon(Icons.Default.Mosque, null, tint = Emerald600) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                            modifier = Modifier.fillMaxWidth().menuAnchor()
                        )
                        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            locations.forEach { loc ->
                                DropdownMenuItem(
                                    text = { Column { Text(loc.name); Text(loc.district, fontSize = 12.sp, color = Slate500) } },
                                    onClick = { viewModel.selectLocation(loc); expanded = false }
                                )
                            }
                        }
                    }
                }
            }
        }
        
        if (isLoading) {
            item { Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald600) } }
        } else {
            // Next Prayer Card
            item {
                nextPrayer?.let { prayer ->
                    Card(Modifier.fillMaxWidth(), RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
                        Box(Modifier.fillMaxWidth().background(Brush.horizontalGradient(listOf(prayer.color, prayer.color.copy(0.7f)))).padding(24.dp)) {
                            Column {
                                Text("🕌 ${selectedLocation?.name ?: "Mosque"}", color = Color.White.copy(0.9f), fontSize = 12.sp)
                                Text("Next: ${prayer.name}", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.height(16.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column { Text("Remaining", color = Color.White.copy(0.7f), fontSize = 12.sp); Text(countdown, color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Bold) }
                                    Column(horizontalAlignment = Alignment.End) { Text("Adhan", color = Color.White.copy(0.7f), fontSize = 12.sp); Text(prayer.adhan, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.SemiBold) }
                                }
                            }
                        }
                    }
                }
            }
            
            // Prayer rows
            items(prayers) { prayer ->
                val passed = isPassed(prayer.adhan)
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(12.dp)) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(10.dp).clip(CircleShape).background(if (passed) Slate300 else prayer.color))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) { Text(prayer.name, fontWeight = FontWeight.Medium, color = if (passed) Slate500 else Slate800); Text(prayer.tamil, fontSize = 11.sp, color = Slate500) }
                        Text(prayer.adhan, fontWeight = FontWeight.SemiBold, color = if (passed) Slate500 else prayer.color, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
                        Text(prayer.iqamah, color = if (passed) Slate500 else Slate700, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
                    }
                }
            }
        }
        
        item { Spacer(Modifier.height(80.dp)) }
    }
}

// ============= OTHER SCREENS =============
@Composable
fun NearbyScreen() {
    var locations by remember { mutableStateOf<List<MosqueLocation>>(emptyList()) }
    val context = LocalContext.current
    
    LaunchedEffect(Unit) {
        locations = withContext(Dispatchers.IO) { SupabaseApi.fetchLocations() }
    }
    
    LazyColumn(Modifier.fillMaxSize().background(Slate100), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("Nearby Mosques", fontSize = 24.sp, fontWeight = FontWeight.Bold) }
        items(locations) { loc ->
            Card(Modifier.fillMaxWidth().clickable {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=${loc.lat},${loc.lon}")).apply { setPackage("com.google.android.apps.maps") }
                try { context.startActivity(intent) } catch (e: Exception) { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}"))) }
            }, colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Mosque, null, tint = Emerald600, modifier = Modifier.size(40.dp))
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) { Text(loc.name, fontWeight = FontWeight.Medium); Text(loc.district, color = Slate500) }
                    Icon(Icons.Default.Navigation, null, tint = Emerald600)
                }
            }
        }
    }
}

@Composable fun QiblaScreen() { Box(Modifier.fillMaxSize().background(Brush.radialGradient(listOf(Emerald100, Color.White))), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("🧭", fontSize = 100.sp); Text("281° West", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Emerald600) } } }

@Composable fun QazaScreen() { val prayers = listOf("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"); val counts = remember { mutableStateMapOf<String, Int>().apply { prayers.forEach { put(it, 0) } } }; LazyColumn(Modifier.fillMaxSize().background(Slate100), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { Text("Qaza Prayers", fontSize = 24.sp, fontWeight = FontWeight.Bold) }; items(prayers) { prayer -> Card(colors = CardDefaults.cardColors(containerColor = Color.White)) { Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Text(prayer, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f)); IconButton({ counts[prayer] = maxOf(0, (counts[prayer] ?: 0) - 1) }) { Icon(Icons.Default.Remove, null, tint = Color.Red) }; Text("${counts[prayer] ?: 0}", modifier = Modifier.width(48.dp), textAlign = TextAlign.Center); IconButton({ counts[prayer] = (counts[prayer] ?: 0) + 1 }) { Icon(Icons.Default.Add, null, tint = Emerald600) } } } } } }

@Composable fun SettingsScreen() { var dnd by remember { mutableStateOf(true) }; LazyColumn(Modifier.fillMaxSize().background(Slate100), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { Text("Settings", fontSize = 24.sp, fontWeight = FontWeight.Bold) }; item { Card(colors = CardDefaults.cardColors(containerColor = Color.White)) { Row(Modifier.fillMaxWidth().padding(16.dp)) { Text("Do Not Disturb", Modifier.weight(1f)); Switch(dnd, { dnd = it }, colors = SwitchDefaults.colors(checkedTrackColor = Emerald600)) } } } } }

// ============= UTILITIES =============
fun parseTime(timeStr: String): LocalTime? = try { val t = timeStr.trim().uppercase(); if (t.contains("AM") || t.contains("PM")) { val p = t.split(" "); val hm = p[0].split(":"); var h = hm[0].toInt(); val m = hm[1].toInt(); if (p[1] == "PM" && h != 12) h += 12 else if (p[1] == "AM" && h == 12) h = 0; LocalTime.of(h, m) } else { val hm = t.split(":"); LocalTime.of(hm[0].toInt(), hm[1].toInt()) } } catch (e: Exception) { null }
fun isPassed(timeStr: String): Boolean = parseTime(timeStr)?.let { LocalTime.now().isAfter(it) } ?: false
