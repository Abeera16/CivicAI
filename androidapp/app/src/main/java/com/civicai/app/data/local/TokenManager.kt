package com.civicai.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "civicai_session")

/**
 * Persists the JWT pair returned by POST /auth/login (and refreshed via
 * POST /auth/refresh) plus the signed-in user's role, so the UI can hide
 * staff-only actions for citizen accounts as required by the API doc.
 */
class TokenManager(private val context: Context) {

    private object Keys {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val ROLE = stringPreferencesKey("role")
        val FULL_NAME = stringPreferencesKey("full_name")
        val EMAIL = stringPreferencesKey("email")
    }

    val accessTokenFlow: Flow<String?> = context.dataStore.data.map { it[Keys.ACCESS_TOKEN] }
    val roleFlow: Flow<String?> = context.dataStore.data.map { it[Keys.ROLE] }
    val fullNameFlow: Flow<String?> = context.dataStore.data.map { it[Keys.FULL_NAME] }
    val isLoggedInFlow: Flow<Boolean> = context.dataStore.data.map { it[Keys.ACCESS_TOKEN] != null }

    suspend fun getAccessToken(): String? = context.dataStore.data.first()[Keys.ACCESS_TOKEN]
    suspend fun getRefreshToken(): String? = context.dataStore.data.first()[Keys.REFRESH_TOKEN]
    suspend fun getRole(): String? = context.dataStore.data.first()[Keys.ROLE]

    suspend fun saveTokens(access: String, refresh: String) {
        context.dataStore.edit {
            it[Keys.ACCESS_TOKEN] = access
            it[Keys.REFRESH_TOKEN] = refresh
        }
    }

    suspend fun saveProfile(role: String, fullName: String, email: String) {
        context.dataStore.edit {
            it[Keys.ROLE] = role
            it[Keys.FULL_NAME] = fullName
            it[Keys.EMAIL] = email
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
