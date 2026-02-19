package app.lovable.adhan_zen_95.ui.screens.qibla

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.lovable.adhan_zen_95.ui.theme.*
import kotlin.math.*

// Kaaba coordinates
private const val KAABA_LAT = 21.4225
private const val KAABA_LNG = 39.8262

@Composable
fun QiblaScreen() {
    val context = LocalContext.current
    var compassBearing by remember { mutableFloatStateOf(0f) }
    var qiblaDirection by remember { mutableFloatStateOf(0f) }
    
    // Sensor manager for compass
    DisposableEffect(Unit) {
        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        val magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
        
        val gravity = FloatArray(3)
        val geomagnetic = FloatArray(3)
        val rotation = FloatArray(9)
        val orientation = FloatArray(3)
        
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                when (event.sensor.type) {
                    Sensor.TYPE_ACCELEROMETER -> System.arraycopy(event.values, 0, gravity, 0, 3)
                    Sensor.TYPE_MAGNETIC_FIELD -> System.arraycopy(event.values, 0, geomagnetic, 0, 3)
                }
                
                if (SensorManager.getRotationMatrix(rotation, null, gravity, geomagnetic)) {
                    SensorManager.getOrientation(rotation, orientation)
                    compassBearing = Math.toDegrees(orientation[0].toDouble()).toFloat()
                }
            }
            
            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }
        
        sensorManager.registerListener(listener, accelerometer, SensorManager.SENSOR_DELAY_UI)
        sensorManager.registerListener(listener, magnetometer, SensorManager.SENSOR_DELAY_UI)
        
        // Calculate Qibla direction (assuming Chennai as default location)
        // TODO: Get actual device location
        val deviceLat = 13.0827
        val deviceLng = 80.2707
        qiblaDirection = calculateQiblaDirection(deviceLat, deviceLng).toFloat()
        
        onDispose {
            sensorManager.unregisterListener(listener)
        }
    }
    
    val animatedRotation by animateFloatAsState(
        targetValue = -compassBearing,
        animationSpec = tween(300, easing = LinearOutSlowInEasing),
        label = "compass"
    )
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Slate900, Slate800)
                )
            )
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        Text(
            text = "Qibla Direction",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            modifier = Modifier.padding(top = 32.dp)
        )
        
        Text(
            text = "கிப்லா திசை",
            style = MaterialTheme.typography.bodyLarge,
            color = Slate400
        )
        
        Spacer(modifier = Modifier.height(48.dp))
        
        // Compass
        Box(
            modifier = Modifier.size(300.dp),
            contentAlignment = Alignment.Center
        ) {
            // Outer ring
            Canvas(
                modifier = Modifier
                    .size(280.dp)
                    .rotate(animatedRotation)
            ) {
                val strokeWidth = 4.dp.toPx()
                
                // Compass circle
                drawCircle(
                    color = Slate600,
                    radius = size.minDimension / 2 - strokeWidth,
                    style = Stroke(width = strokeWidth)
                )
                
                // Direction markers
                val center = Offset(size.width / 2, size.height / 2)
                val radius = size.minDimension / 2 - 30.dp.toPx()
                
                // N, E, S, W markers
                listOf(0f, 90f, 180f, 270f).forEach { angle ->
                    val radians = Math.toRadians(angle.toDouble())
                    val start = Offset(
                        (center.x + radius * sin(radians)).toFloat(),
                        (center.y - radius * cos(radians)).toFloat()
                    )
                    val end = Offset(
                        (center.x + (radius - 20.dp.toPx()) * sin(radians)).toFloat(),
                        (center.y - (radius - 20.dp.toPx()) * cos(radians)).toFloat()
                    )
                    drawLine(
                        color = if (angle == 0f) Color.Red else Slate400,
                        start = end,
                        end = start,
                        strokeWidth = if (angle == 0f) 4.dp.toPx() else 2.dp.toPx(),
                        cap = StrokeCap.Round
                    )
                }
            }
            
            // Qibla arrow (fixed, points to Qibla)
            Box(
                modifier = Modifier
                    .size(200.dp)
                    .rotate(qiblaDirection + animatedRotation),
                contentAlignment = Alignment.TopCenter
            ) {
                Icon(
                    Icons.Default.Navigation,
                    contentDescription = "Qibla",
                    tint = Emerald400,
                    modifier = Modifier
                        .size(48.dp)
                        .offset(y = 20.dp)
                )
            }
            
            // Center point
            Surface(
                shape = CircleShape,
                color = Emerald500,
                modifier = Modifier.size(16.dp)
            ) {}
        }
        
        Spacer(modifier = Modifier.height(48.dp))
        
        // Qibla info card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Slate700)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Kaaba Direction",
                    style = MaterialTheme.typography.titleMedium,
                    color = Slate300
                )
                
                Text(
                    text = "${qiblaDirection.toInt()}° from North",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Emerald400
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = Slate400,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Point the green arrow towards Qibla",
                        style = MaterialTheme.typography.bodySmall,
                        color = Slate400
                    )
                }
            }
        }
    }
}

private fun calculateQiblaDirection(lat: Double, lng: Double): Double {
    val latRad = Math.toRadians(lat)
    val lngRad = Math.toRadians(lng)
    val kaabaLatRad = Math.toRadians(KAABA_LAT)
    val kaabaLngRad = Math.toRadians(KAABA_LNG)
    
    val dLng = kaabaLngRad - lngRad
    
    val x = sin(dLng) * cos(kaabaLatRad)
    val y = cos(latRad) * sin(kaabaLatRad) - sin(latRad) * cos(kaabaLatRad) * cos(dLng)
    
    var bearing = Math.toDegrees(atan2(x, y))
    if (bearing < 0) bearing += 360
    
    return bearing
}
