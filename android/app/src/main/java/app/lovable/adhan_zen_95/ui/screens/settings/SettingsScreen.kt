package app.lovable.adhan_zen_95.ui.screens.settings

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.lovable.adhan_zen_95.ui.theme.*

@Composable
fun SettingsScreen() {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("dnd_user_settings", Context.MODE_PRIVATE)
    
    // DND Settings State
    var dndEnabled by remember { mutableStateOf(prefs.getBoolean("dnd_enabled", true)) }
    var dndFajr by remember { mutableStateOf(prefs.getBoolean("dnd_fajr", true)) }
    var dndDhuhr by remember { mutableStateOf(prefs.getBoolean("dnd_dhuhr", true)) }
    var dndAsr by remember { mutableStateOf(prefs.getBoolean("dnd_asr", true)) }
    var dndMaghrib by remember { mutableStateOf(prefs.getBoolean("dnd_maghrib", true)) }
    var dndIsha by remember { mutableStateOf(prefs.getBoolean("dnd_isha", true)) }
    var dndMinutesBefore by remember { 
        mutableFloatStateOf(prefs.getInt("dnd_minutes_before", 5).toFloat()) 
    }
    var dndMinutesAfter by remember { 
        mutableFloatStateOf(prefs.getInt("dnd_minutes_after", 15).toFloat()) 
    }
    
    // Other Settings
    var notificationsEnabled by remember { mutableStateOf(true) }
    var vibrationEnabled by remember { mutableStateOf(true) }
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Slate50, Color.White)
                )
            )
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Settings",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Slate800
            )
            Text(
                text = "அமைப்புகள்",
                style = MaterialTheme.typography.bodyMedium,
                color = Slate500
            )
            Spacer(modifier = Modifier.height(8.dp))
        }
        
        // DND Settings Section
        item {
            SettingsSection(title = "Do Not Disturb", icon = Icons.Default.DoNotDisturbOn) {
                SettingsToggle(
                    title = "Enable DND during prayer",
                    subtitle = "Automatically silence phone during Iqamah time",
                    checked = dndEnabled,
                    onCheckedChange = { 
                        dndEnabled = it
                        prefs.edit().putBoolean("dnd_enabled", it).apply()
                    }
                )
                
                if (dndEnabled) {
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "Enable DND for:",
                        style = MaterialTheme.typography.labelMedium,
                        color = Slate600,
                        modifier = Modifier.padding(start = 8.dp, bottom = 8.dp)
                    )
                    
                    DndPrayerToggle("Fajr", "ஃபஜ்ர்", dndFajr, FajrColor) { 
                        dndFajr = it
                        prefs.edit().putBoolean("dnd_fajr", it).apply()
                    }
                    DndPrayerToggle("Dhuhr", "ளுஹர்", dndDhuhr, DhuhrColor) { 
                        dndDhuhr = it
                        prefs.edit().putBoolean("dnd_dhuhr", it).apply()
                    }
                    DndPrayerToggle("Asr", "அஸர்", dndAsr, AsrColor) { 
                        dndAsr = it
                        prefs.edit().putBoolean("dnd_asr", it).apply()
                    }
                    DndPrayerToggle("Maghrib", "மஃக்ரிப்", dndMaghrib, MaghribColor) { 
                        dndMaghrib = it
                        prefs.edit().putBoolean("dnd_maghrib", it).apply()
                    }
                    DndPrayerToggle("Isha", "இஷா", dndIsha, IshaColor) { 
                        dndIsha = it
                        prefs.edit().putBoolean("dnd_isha", it).apply()
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Minutes before Iqamah
                    Text(
                        text = "Start DND ${dndMinutesBefore.toInt()} min before Iqamah",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate700
                    )
                    Slider(
                        value = dndMinutesBefore,
                        onValueChange = { 
                            dndMinutesBefore = it
                            prefs.edit().putInt("dnd_minutes_before", it.toInt()).apply()
                        },
                        valueRange = 0f..15f,
                        steps = 14,
                        colors = SliderDefaults.colors(
                            thumbColor = Emerald600,
                            activeTrackColor = Emerald600
                        )
                    )
                    
                    // Minutes after Iqamah
                    Text(
                        text = "End DND ${dndMinutesAfter.toInt()} min after Iqamah",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate700
                    )
                    Slider(
                        value = dndMinutesAfter,
                        onValueChange = { 
                            dndMinutesAfter = it
                            prefs.edit().putInt("dnd_minutes_after", it.toInt()).apply()
                        },
                        valueRange = 5f..30f,
                        steps = 24,
                        colors = SliderDefaults.colors(
                            thumbColor = Emerald600,
                            activeTrackColor = Emerald600
                        )
                    )
                }
            }
        }
        
        // Notifications Section
        item {
            SettingsSection(title = "Notifications", icon = Icons.Default.Notifications) {
                SettingsToggle(
                    title = "Adhan Notifications",
                    subtitle = "Show notification when Adhan time arrives",
                    checked = notificationsEnabled,
                    onCheckedChange = { notificationsEnabled = it }
                )
                
                SettingsToggle(
                    title = "Vibration",
                    subtitle = "Vibrate with Adhan notification",
                    checked = vibrationEnabled,
                    onCheckedChange = { vibrationEnabled = it }
                )
            }
        }
        
        // About Section
        item {
            SettingsSection(title = "About", icon = Icons.Default.Info) {
                SettingsItem(
                    title = "Version",
                    subtitle = "2.0.0 Native",
                    icon = Icons.Default.Android
                )
                
                SettingsItem(
                    title = "Developer",
                    subtitle = "Adhan Zen Team",
                    icon = Icons.Default.Code
                )
            }
        }
        
        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

@Composable
fun SettingsSection(
    title: String,
    icon: ImageVector,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 12.dp)
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = Emerald600,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Slate800
                )
            }
            
            content()
        }
    }
}

@Composable
fun SettingsToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = Slate800
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = Slate500
            )
        }
        
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Emerald600,
                checkedTrackColor = Emerald200
            )
        )
    }
}

@Composable
fun DndPrayerToggle(
    name: String,
    nameTamil: String,
    checked: Boolean,
    color: Color,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp, horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = color.copy(alpha = 0.1f),
            modifier = Modifier.size(32.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = color,
                    modifier = Modifier.size(12.dp)
                ) {}
            }
        }
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = Slate700
            )
            Text(
                text = nameTamil,
                style = MaterialTheme.typography.labelSmall,
                color = Slate500
            )
        }
        
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(
                checkedColor = color,
                uncheckedColor = Slate400
            )
        )
    }
}

@Composable
fun SettingsItem(
    title: String,
    subtitle: String,
    icon: ImageVector
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = Slate400,
            modifier = Modifier.size(20.dp)
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                color = Slate700
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = Slate500
            )
        }
    }
}
