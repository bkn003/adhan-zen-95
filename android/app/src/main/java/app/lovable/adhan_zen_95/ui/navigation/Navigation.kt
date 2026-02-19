package app.lovable.adhan_zen_95.ui.navigation

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import app.lovable.adhan_zen_95.ui.screens.home.HomeScreen
import app.lovable.adhan_zen_95.ui.screens.nearby.NearbyScreen
import app.lovable.adhan_zen_95.ui.screens.qaza.QazaScreen
import app.lovable.adhan_zen_95.ui.screens.qibla.QiblaScreen
import app.lovable.adhan_zen_95.ui.screens.settings.SettingsScreen
import app.lovable.adhan_zen_95.ui.theme.Emerald600

/**
 * Navigation routes for the app.
 */
sealed class Screen(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Home : Screen("home", "Home", Icons.Filled.Home, Icons.Outlined.Home)
    object Nearby : Screen("nearby", "Nearby", Icons.Filled.NearMe, Icons.Outlined.NearMe)
    object Qibla : Screen("qibla", "Qibla", Icons.Filled.Explore, Icons.Outlined.Explore)
    object Qaza : Screen("qaza", "Qaza", Icons.Filled.Checklist, Icons.Outlined.Checklist)
    object Settings : Screen("settings", "Settings", Icons.Filled.Settings, Icons.Outlined.Settings)
}

val bottomNavItems = listOf(
    Screen.Home,
    Screen.Nearby,
    Screen.Qibla,
    Screen.Qaza,
    Screen.Settings
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdhanNavigation() {
    val navController = rememberNavController()
    
    Scaffold(
        bottomBar = {
            AdhanBottomBar(navController = navController)
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.Home.route) { HomeScreen() }
            composable(Screen.Nearby.route) { NearbyScreen() }
            composable(Screen.Qibla.route) { QiblaScreen() }
            composable(Screen.Qaza.route) { QazaScreen() }
            composable(Screen.Settings.route) { SettingsScreen() }
        }
    }
}

@Composable
fun AdhanBottomBar(navController: NavHostController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface
    ) {
        bottomNavItems.forEach { screen ->
            val selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true
            
            NavigationBarItem(
                icon = {
                    Icon(
                        imageVector = if (selected) screen.selectedIcon else screen.unselectedIcon,
                        contentDescription = screen.title
                    )
                },
                label = { Text(screen.title) },
                selected = selected,
                onClick = {
                    navController.navigate(screen.route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Emerald600,
                    selectedTextColor = Emerald600,
                    indicatorColor = Emerald600.copy(alpha = 0.1f)
                )
            )
        }
    }
}
