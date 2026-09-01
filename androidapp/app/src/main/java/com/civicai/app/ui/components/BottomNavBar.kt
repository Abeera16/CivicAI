package com.civicai.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import com.civicai.app.ui.navigation.Dest
import com.civicai.app.ui.theme.CivicNavy

private data class NavItem(val route: String, val label: String, val icon: ImageVector)

private val items = listOf(
    NavItem(Dest.Home.route, "Home", Icons.Default.Home),
    NavItem(Dest.Nearby.route, "Nearby", Icons.Default.Place),
    NavItem(Dest.MyReports.route, "Reports", Icons.Default.Description),
    NavItem(Dest.Alerts.route, "Alerts", Icons.Default.Notifications),
    NavItem(Dest.Chat.route, "AI", Icons.Default.AutoAwesome)
)

@Composable
fun CivicBottomBar(currentRoute: String?, unreadAlerts: Int, onNavigate: (String) -> Unit) {
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = {
                    if (item.route == Dest.Alerts.route && unreadAlerts > 0) {
                        BadgedBox(badge = { Badge { Text("$unreadAlerts") } }) {
                            Icon(item.icon, contentDescription = item.label)
                        }
                    } else {
                        Icon(item.icon, contentDescription = item.label)
                    }
                },
                label = { Text(item.label) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = CivicNavy,
                    selectedTextColor = CivicNavy,
                    indicatorColor = CivicNavy.copy(alpha = 0.12f)
                )
            )
        }
    }
}
