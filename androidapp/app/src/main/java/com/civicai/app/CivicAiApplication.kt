package com.civicai.app

import android.app.Application
import com.civicai.app.data.local.TokenManager
import com.civicai.app.data.remote.CivicAiApiService
import com.civicai.app.data.remote.NetworkModule
import com.civicai.app.data.repository.AssistantRepository
import com.civicai.app.data.repository.AuthRepository
import com.civicai.app.data.repository.CityDataRepository
import com.civicai.app.data.repository.IncidentsRepository
import com.civicai.app.data.repository.ReportsRepository
import org.osmdroid.config.Configuration

/**
 * Lightweight, hand-rolled service locator (no Hilt/Dagger) so the whole
 * dependency graph is readable in one place. Every screen's ViewModel
 * pulls its repository from here via [AppContainer].
 */
class CivicAiApplication : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        // OSMDroid requires its user-agent and storage to be configured before any MapView is created.
        Configuration.getInstance().apply {
            userAgentValue = packageName
            load(this@CivicAiApplication, getSharedPreferences("osmdroid", MODE_PRIVATE))
        }
        container = AppContainer(this)
    }
}

class AppContainer(app: Application) {
    val tokenManager = TokenManager(app)
    val apiService: CivicAiApiService = NetworkModule.provideApiService(tokenManager)

    val authRepository = AuthRepository(apiService, tokenManager)
    val reportsRepository = ReportsRepository(apiService)
    val incidentsRepository = IncidentsRepository(apiService)
    val cityDataRepository = CityDataRepository(apiService)
    val assistantRepository = AssistantRepository(apiService)
}
