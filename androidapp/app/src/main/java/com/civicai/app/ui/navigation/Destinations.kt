package com.civicai.app.ui.navigation

sealed class Dest(val route: String) {
    object Welcome : Dest("welcome")
    object Login : Dest("login")
    object Register : Dest("register")

    object Home : Dest("home")
    object Nearby : Dest("nearby")
    object MyReports : Dest("my_reports")
    object Alerts : Dest("alerts")
    object Chat : Dest("chat")

    object Report : Dest("report")
    object CommandCenter : Dest("command_center")

    object IncidentDetail : Dest("incident/{incidentId}") {
        fun build(incidentId: String) = "incident/$incidentId"
    }

    companion object {
        val bottomBarRoutes = listOf(Home.route, Nearby.route, MyReports.route, Alerts.route, Chat.route)
    }
}
