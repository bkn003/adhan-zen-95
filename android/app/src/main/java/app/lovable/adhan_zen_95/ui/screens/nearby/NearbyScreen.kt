package app.lovable.adhan_zen_95.ui.screens.nearby

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import app.lovable.adhan_zen_95.data.model.Location
import app.lovable.adhan_zen_95.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NearbyScreen(
    viewModel: NearbyViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        Text(
            text = "Nearby Mosques",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Slate800
        )
        
        Text(
            text = "அருகிலுள்ள மஸ்ஜிதுகள்",
            style = MaterialTheme.typography.bodyMedium,
            color = Slate500,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        // District Filter
        var selectedDistrict by remember { mutableStateOf<String?>(null) }
        
        if (uiState.districts.isNotEmpty()) {
            ScrollableTabRow(
                selectedTabIndex = uiState.districts.indexOf(selectedDistrict).coerceAtLeast(0),
                modifier = Modifier.fillMaxWidth(),
                edgePadding = 0.dp
            ) {
                Tab(
                    selected = selectedDistrict == null,
                    onClick = { 
                        selectedDistrict = null
                        viewModel.filterByDistrict(null)
                    },
                    text = { Text("All") }
                )
                uiState.districts.forEach { district ->
                    Tab(
                        selected = selectedDistrict == district,
                        onClick = { 
                            selectedDistrict = district
                            viewModel.filterByDistrict(district)
                        },
                        text = { Text(district) }
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Locations List
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Emerald600)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.filteredLocations) { location ->
                    NearbyMosqueCard(
                        location = location,
                        onNavigateClick = {
                            // Open Google Maps with lat/lng
                            val uri = Uri.parse("geo:${location.latitude},${location.longitude}?q=${location.latitude},${location.longitude}(${Uri.encode(location.mosqueName)})")
                            val intent = Intent(Intent.ACTION_VIEW, uri)
                            intent.setPackage("com.google.android.apps.maps")
                            context.startActivity(intent)
                        }
                    )
                }
                
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
fun NearbyMosqueCard(
    location: Location,
    onNavigateClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Mosque Icon
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Emerald100
            ) {
                Icon(
                    Icons.Default.Mosque,
                    contentDescription = null,
                    tint = Emerald600,
                    modifier = Modifier
                        .padding(12.dp)
                        .size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            // Mosque Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = location.mosqueName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Slate800
                )
                Text(
                    text = location.district,
                    style = MaterialTheme.typography.bodySmall,
                    color = Slate500
                )
                
                // Amenities
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (location.womenPrayerHall == true) {
                        AmenityChip("Women's Hall", Icons.Default.Female)
                    }
                    if (location.saharFoodAvailability == true) {
                        AmenityChip("Sahar Food", Icons.Default.Restaurant)
                    }
                }
            }
            
            // Navigate Button
            IconButton(onClick = onNavigateClick) {
                Icon(
                    Icons.Default.Navigation,
                    contentDescription = "Navigate",
                    tint = Emerald600,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

@Composable
fun AmenityChip(text: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Purple100
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = Purple600,
                modifier = Modifier.size(12.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall,
                color = Purple700
            )
        }
    }
}
