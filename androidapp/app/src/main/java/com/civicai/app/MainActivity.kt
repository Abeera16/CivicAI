package com.civicai.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.civicai.app.ui.navigation.CivicNavGraph
import com.civicai.app.ui.theme.CivicAITheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = (application as CivicAiApplication).container

        setContent {
            val isLoggedIn by container.authRepository.isLoggedIn.collectAsState(initial = false)
            val role by container.authRepository.role.collectAsState(initial = null)
            val fullName by container.authRepository.fullName.collectAsState(initial = null)

            CivicAITheme {
                CivicNavGraph(
                    isLoggedIn = isLoggedIn,
                    role = role,
                    fullName = fullName,
                    onLogout = { container.authRepository.logout() }
                )
            }
        }
    }
}
