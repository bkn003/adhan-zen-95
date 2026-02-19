package app.lovable.adhan_zen_95.ui.screens.home

import android.util.Log
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import app.lovable.adhan_zen_95.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Emerald50, Color.White)
                )
            )
    ) {
        if (uiState.isLoading && uiState.prayerTimes.isEmpty()) {
            // Loading state
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = Emerald600)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Loading prayer times...", color = Slate600)
                }
            }
        } else if (uiState.error != null) {
            // Error state
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Error, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Error: ${uiState.error}", color = Slate600)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Next Prayer Card
                item {
                    uiState.nextPrayer?.let { prayer ->
                        NextPrayerCard(
                            prayer = prayer,
                            countdown = uiState.timeUntilNext,
                            locationName = uiState.selectedLocation?.mosqueName ?: ""
                        )
                    }
                }
                
                // Location Selector
                item {
                    LocationSelectorCard(
                        locations = uiState.locations,
                        selectedLocation = uiState.selectedLocation,
                        onLocationSelect = { viewModel.selectLocation(it) }
                    )
                }
                
                // Prayer Times Header
                item {
                    PrayerTimesHeader()
                }
                
                // Prayer Times List
                items(uiState.prayerTimes) { prayer ->
                    PrayerTimeCard(
                        prayer = prayer,
                        isNext = prayer == uiState.nextPrayer
                    )
                }
                
                // Bottom spacing for nav bar
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
fun NextPrayerCard(
    prayer: PrayerInfo,
    countdown: String,
    locationName: String
) {
    val prayerColor = getPrayerColor(prayer.type)
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.Transparent
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(prayerColor, prayerColor.copy(alpha = 0.7f))
                    )
                )
                .padding(24.dp)
        ) {
            Column {
                // Location
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.9f),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = locationName,
                        color = Color.White.copy(alpha = 0.9f),
                        style = MaterialTheme.typography.labelMedium
                    )
                }
                
                // Next Prayer Name
                Text(
                    text = "Next: ${prayer.name}",
                    color = Color.White,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                
                Text(
                    text = prayer.nameTamil,
                    color = Color.White.copy(alpha = 0.8f),
                    style = MaterialTheme.typography.bodyMedium
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Countdown Timer
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Column {
                        Text(
                            text = "Time Remaining",
                            color = Color.White.copy(alpha = 0.7f),
                            style = MaterialTheme.typography.labelSmall
                        )
                        Text(
                            text = countdown.ifEmpty { "--:--" },
                            color = Color.White,
                            fontSize = 40.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp
                        )
                    }
                    
                    // Adhan Time
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "Adhan",
                            color = Color.White.copy(alpha = 0.7f),
                            style = MaterialTheme.typography.labelSmall
                        )
                        Text(
                            text = prayer.adhanTime,
                            color = Color.White,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationSelectorCard(
    locations: List<app.lovable.adhan_zen_95.data.model.Location>,
    selectedLocation: app.lovable.adhan_zen_95.data.model.Location?,
    onLocationSelect: (app.lovable.adhan_zen_95.data.model.Location) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = it }
        ) {
            OutlinedTextField(
                value = selectedLocation?.mosqueName ?: "Select Location",
                onValueChange = {},
                readOnly = true,
                leadingIcon = {
                    Icon(Icons.Default.Mosque, contentDescription = null, tint = Emerald600)
                },
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Emerald600,
                    unfocusedBorderColor = Slate200
                )
            )
            
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                locations.forEach { location ->
                    DropdownMenuItem(
                        text = {
                            Column {
                                Text(location.mosqueName, fontWeight = FontWeight.Medium)
                                Text(
                                    location.district,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate500
                                )
                            }
                        },
                        onClick = {
                            onLocationSelect(location)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun PrayerTimesHeader() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            HeaderText("Prayer", "தொழுகை", Modifier.weight(1f))
            HeaderText("Adhan", "அதான்", Modifier.weight(1f))
            HeaderText("Iqamah", "இகாமத்", Modifier.weight(1f))
        }
    }
}

@Composable
fun HeaderText(english: String, tamil: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = english,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = Slate700
        )
        Text(
            text = tamil,
            style = MaterialTheme.typography.labelSmall,
            color = Slate500
        )
    }
}

@Composable
fun PrayerTimeCard(
    prayer: PrayerInfo,
    isNext: Boolean
) {
    val prayerColor = getPrayerColor(prayer.type)
    val backgroundColor = if (isNext) prayerColor.copy(alpha = 0.1f) else Color.White
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Prayer indicator dot
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(
                        if (prayer.isPassed) Slate300 else prayerColor
                    )
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            // Prayer name
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = prayer.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (isNext) FontWeight.Bold else FontWeight.Medium,
                    color = if (prayer.isPassed) Slate400 else Slate800
                )
                Text(
                    text = prayer.nameTamil,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (prayer.isPassed) Slate300 else Slate500
                )
            }
            
            // Adhan time
            Text(
                text = prayer.adhanTime,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (prayer.isPassed) Slate400 else prayerColor,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center
            )
            
            // Iqamah time
            Text(
                text = prayer.iqamahTime,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = if (prayer.isPassed) Slate400 else Slate700,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center
            )
        }
    }
}

fun getPrayerColor(type: PrayerType): Color = when (type) {
    PrayerType.FAJR -> FajrColor
    PrayerType.DHUHR, PrayerType.JUMMAH -> DhuhrColor
    PrayerType.ASR -> AsrColor
    PrayerType.MAGHRIB, PrayerType.IFTAR -> MaghribColor
    PrayerType.ISHA, PrayerType.THARAWEEH -> IshaColor
    PrayerType.SAHAR -> Purple500
}
