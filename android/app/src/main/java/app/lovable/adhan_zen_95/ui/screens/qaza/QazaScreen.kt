package app.lovable.adhan_zen_95.ui.screens.qaza

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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.lovable.adhan_zen_95.ui.theme.*

data class QazaPrayer(
    val name: String,
    val nameTamil: String,
    val count: Int,
    val color: Color
)

@Composable
fun QazaScreen() {
    var qazaList by remember {
        mutableStateOf(
            listOf(
                QazaPrayer("Fajr", "ஃபஜ்ர்", 0, FajrColor),
                QazaPrayer("Dhuhr", "ளுஹர்", 0, DhuhrColor),
                QazaPrayer("Asr", "அஸர்", 0, AsrColor),
                QazaPrayer("Maghrib", "மஃக்ரிப்", 0, MaghribColor),
                QazaPrayer("Isha", "இஷா", 0, IshaColor)
            )
        )
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Purple50, Color.White)
                )
            )
            .padding(16.dp)
    ) {
        // Header
        Text(
            text = "Qaza Prayers",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Slate800
        )
        
        Text(
            text = "காலா தொழுகைகள்",
            style = MaterialTheme.typography.bodyMedium,
            color = Slate500
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Track your missed prayers and make them up",
            style = MaterialTheme.typography.bodySmall,
            color = Slate400
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Total Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color.Transparent
            )
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(Purple500, Purple600)
                        )
                    )
                    .padding(24.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Total Pending",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                    
                    Text(
                        text = "${qazaList.sumOf { it.count }}",
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    
                    Text(
                        text = "prayers to make up",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Prayer Counters
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(qazaList) { prayer ->
                QazaCounterCard(
                    prayer = prayer,
                    onIncrement = {
                        qazaList = qazaList.map { 
                            if (it.name == prayer.name) it.copy(count = it.count + 1) 
                            else it 
                        }
                    },
                    onDecrement = {
                        if (prayer.count > 0) {
                            qazaList = qazaList.map { 
                                if (it.name == prayer.name) it.copy(count = it.count - 1) 
                                else it 
                            }
                        }
                    }
                )
            }
            
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
fun QazaCounterCard(
    prayer: QazaPrayer,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
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
            // Prayer Indicator
            Surface(
                shape = CircleShape,
                color = prayer.color.copy(alpha = 0.15f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Surface(
                        shape = CircleShape,
                        color = prayer.color,
                        modifier = Modifier.size(16.dp)
                    ) {}
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // Prayer Name
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = prayer.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Slate800
                )
                Text(
                    text = prayer.nameTamil,
                    style = MaterialTheme.typography.bodySmall,
                    color = Slate500
                )
            }
            
            // Counter Controls
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Decrement
                FilledIconButton(
                    onClick = onDecrement,
                    enabled = prayer.count > 0,
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = if (prayer.count > 0) Emerald100 else Slate100,
                        contentColor = if (prayer.count > 0) Emerald700 else Slate400
                    ),
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(Icons.Default.Remove, contentDescription = "Decrease")
                }
                
                // Count
                Text(
                    text = "${prayer.count}",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = prayer.color,
                    modifier = Modifier.widthIn(min = 48.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                
                // Increment
                FilledIconButton(
                    onClick = onIncrement,
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = prayer.color.copy(alpha = 0.15f),
                        contentColor = prayer.color
                    ),
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Increase")
                }
            }
        }
    }
}
