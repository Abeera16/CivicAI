package com.civicai.app.data.remote.dto

data class RegisterRequest(
    val full_name: String,
    val email: String,
    val password: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RefreshRequest(
    val refresh_token: String
)

data class TokenResponse(
    val access_token: String,
    val refresh_token: String,
    val token_type: String
)

/** GET /api/auth/me */
data class UserDto(
    val id: String,
    val full_name: String,
    val email: String,
    val role: String // "citizen" | "staff"
)
