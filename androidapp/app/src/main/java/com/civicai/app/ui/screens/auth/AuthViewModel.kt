package com.civicai.app.ui.screens.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.repository.AuthRepository
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

class AuthViewModel(private val authRepository: AuthRepository) : ViewModel() {

    var uiState by mutableStateOf(AuthUiState())
        private set

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        if (email.isBlank() || password.isBlank()) {
            uiState = uiState.copy(errorMessage = "Enter your email and password")
            return
        }
        uiState = uiState.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            when (val result = authRepository.login(email.trim(), password)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(isLoading = false)
                    onSuccess()
                }
                is ApiResult.Error -> uiState = uiState.copy(isLoading = false, errorMessage = result.message)
            }
        }
    }

    fun register(fullName: String, email: String, password: String, onSuccess: () -> Unit) {
        if (fullName.isBlank() || email.isBlank() || password.isBlank()) {
            uiState = uiState.copy(errorMessage = "Fill in all fields")
            return
        }
        uiState = uiState.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            when (val result = authRepository.register(fullName.trim(), email.trim(), password)) {
                is ApiResult.Success -> {
                    // Registration doesn't return tokens (per API §2), so log in right after.
                    login(email, password, onSuccess)
                }
                is ApiResult.Error -> uiState = uiState.copy(isLoading = false, errorMessage = result.message)
            }
        }
    }

    fun dismissError() {
        uiState = uiState.copy(errorMessage = null)
    }
}
