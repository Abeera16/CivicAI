package com.civicai.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.compose.foundation.layout.fillMaxSize
import kotlinx.coroutines.launch
import com.civicai.app.ui.components.CivicBottomBar
import com.civicai.app.ui.screens.alerts.AlertsScreen
import com.civicai.app.ui.screens.auth.LoginScreen
import com.civicai.app.ui.screens.auth.RegisterScreen
import com.civicai.app.ui.screens.chat.ChatScreen
import com.civicai.app.ui.screens.commandcenter.CommandCenterScreen
import com.civicai.app.ui.screens.home.HomeScreen
import com.civicai.app.ui.screens.incident.IncidentDetailScreen
import com.civicai.app.ui.screens.myreports.MyReportsScreen
import com.civicai.app.ui.screens.nearby.NearbyScreen
import com.civicai.app.ui.screens.report.ReportScreen
import com.civicai.app.ui.screens.welcome.WelcomeScreen

@Composable
fun CivicNavGraph(
    isLoggedIn: Boolean,
    role: String?, // "citizen" | "staff" | null (guest)
    fullName: String?,
    onLogout: suspend () -> Unit
) {
    val navController = rememberNavController()
    val coroutineScope = rememberCoroutineScope()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val isStaff = role == "staff"

    val startDestination = if (isLoggedIn) Dest.Home.route else Dest.Welcome.route

    Scaffold(
        bottomBar = {
            if (currentRoute in Dest.bottomBarRoutes) {
                CivicBottomBar(
                    currentRoute = currentRoute,
                    unreadAlerts = 0,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        },
        floatingActionButton = {
            if (isStaff && currentRoute == Dest.Home.route) {
                ExtendedFloatingActionButton(
                    onClick = { navController.navigate(Dest.CommandCenter.route) },
                    icon = { Icon(Icons.Default.Dashboard, null) },
                    text = { Text("Command Center") }
                )
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            composable(Dest.Welcome.route) {
                WelcomeScreen(
                    onNext = { navController.navigate(Dest.Login.route) }
                )
            }
            composable(Dest.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Dest.Home.route) { popUpTo(0) }
                    },
                    onGoToRegister = { navController.navigate(Dest.Register.route) },
                    onContinueAsGuest = { navController.navigate(Dest.Home.route) { popUpTo(0) } }
                )
            }
            composable(Dest.Register.route) {
                RegisterScreen(
                    onBack = { navController.popBackStack() },
                    onRegisterSuccess = { navController.navigate(Dest.Home.route) { popUpTo(0) } }
                )
            }

            composable(Dest.Home.route) {
                HomeScreen(
                    userFullName = fullName,
                    onOpenReport = { navController.navigate(Dest.Report.route) },
                    onOpenNearby = { navController.navigate(Dest.Nearby.route) },
                    onOpenMyReports = { navController.navigate(Dest.MyReports.route) },
                    onOpenAlerts = { navController.navigate(Dest.Alerts.route) },
                    onOpenChat = { navController.navigate(Dest.Chat.route) },
                    onOpenIncident = { id -> navController.navigate(Dest.IncidentDetail.build(id)) },
                    onLogout = {
                        coroutineScope.launch {
                            onLogout()
                            navController.navigate(Dest.Welcome.route) { popUpTo(0) }
                        }
                    }
                )
            }
            composable(Dest.Nearby.route) {
                NearbyScreen(onOpenIncident = { id -> navController.navigate(Dest.IncidentDetail.build(id)) })
            }
            composable(Dest.MyReports.route) {
                MyReportsScreen(onOpenIncident = { id -> navController.navigate(Dest.IncidentDetail.build(id)) })
            }
            composable(Dest.Alerts.route) {
                AlertsScreen(onOpenIncident = { id -> navController.navigate(Dest.IncidentDetail.build(id)) })
            }
            composable(Dest.Chat.route) { ChatScreen() }

            composable(Dest.Report.route) {
                ReportScreen(
                    onClose = { navController.popBackStack() },
                    onSubmitted = { navController.popBackStack() }
                )
            }

            composable(Dest.CommandCenter.route) {
                CommandCenterScreen(
                    onBack = { navController.popBackStack() },
                    onOpenIncident = { id -> navController.navigate(Dest.IncidentDetail.build(id)) }
                )
            }

            composable(
                route = Dest.IncidentDetail.route,
                arguments = listOf(navArgument("incidentId") {})
            ) { backStackEntry ->
                val incidentId = backStackEntry.arguments?.getString("incidentId") ?: return@composable
                IncidentDetailScreen(
                    incidentId = incidentId,
                    isStaff = isStaff,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
