package com.civicai.app.data.repository

import com.civicai.app.data.local.TokenManager
import com.civicai.app.data.remote.CivicAiApiService
import com.civicai.app.data.remote.dto.LoginRequest
import com.civicai.app.data.remote.dto.RegisterRequest
import com.civicai.app.data.remote.dto.UserDto
import com.civicai.app.util.ApiResult
import com.civicai.app.util.safeApiCall
import kotlinx.coroutines.flow.Flow

class AuthRepository(
    private val api: CivicAiApiService,
    private val tokenManager: TokenManager
) {
    val isLoggedIn: Flow<Boolean> = tokenManager.isLoggedInFlow
    val role: Flow<String?> = tokenManager.roleFlow
    val fullName: Flow<String?> = tokenManager.fullNameFlow

    suspend fun register(fullName: String, email: String, password: String): ApiResult<UserDto> =
        safeApiCall { api.register(RegisterRequest(fullName, email, password)) }

    suspend fun login(email: String, password: String): ApiResult<UserDto> {
        val loginResult = safeApiCall { api.login(LoginRequest(email, password)) }
        if (loginResult is ApiResult.Error) return ApiResult.Error(loginResult.code, loginResult.message)

        val tokens = (loginResult as ApiResult.Success).data
        tokenManager.saveTokens(tokens.access_token, tokens.refresh_token)

        // Immediately fetch the profile (role is needed to gate staff-only screens).
        return when (val meResult = safeApiCall { api.me() }) {
            is ApiResult.Success -> {
                tokenManager.saveProfile(meResult.data.role, meResult.data.full_name, meResult.data.email)
                meResult
            }
            is ApiResult.Error -> meResult
        }
    }

    suspend fun refreshProfile(): ApiResult<UserDto> {
        return when (val result = safeApiCall { api.me() }) {
            is ApiResult.Success -> {
                tokenManager.saveProfile(result.data.role, result.data.full_name, result.data.email)
                result
            }
            is ApiResult.Error -> result
        }
    }

    suspend fun logout() {
        tokenManager.clear()
    }
}
