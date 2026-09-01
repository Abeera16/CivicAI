package com.civicai.app.ui.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.ui.theme.CivicNavy
import com.civicai.app.ui.theme.TextSecondary
import com.civicai.app.util.viewModelFactory

@Composable
fun RegisterScreen(
    onBack: () -> Unit,
    onRegisterSuccess: () -> Unit
) {
    val viewModel: AuthViewModel = viewModel(factory = viewModelFactory { AuthViewModel(it.authRepository) })
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val state = viewModel.uiState

    Column(Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
        Spacer(Modifier.height(24.dp))
        IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null) }
        Spacer(Modifier.height(8.dp))
        Text("Create your account", style = MaterialTheme.typography.headlineMedium, color = CivicNavy)
        Spacer(Modifier.height(4.dp))
        Text("Join CivicAI to start reporting issues in your area.", color = TextSecondary)

        Spacer(Modifier.height(28.dp))
        OutlinedTextField(
            value = fullName, onValueChange = { fullName = it },
            label = { Text("Full name") },
            leadingIcon = { Icon(Icons.Default.Person, null) },
            singleLine = true, shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(
            value = email, onValueChange = { email = it },
            label = { Text("Email") },
            leadingIcon = { Icon(Icons.Default.Email, null) },
            singleLine = true, shape = RoundedCornerShape(12.dp),
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(
            value = password, onValueChange = { password = it },
            label = { Text("Password") },
            leadingIcon = { Icon(Icons.Default.Lock, null) },
            singleLine = true, shape = RoundedCornerShape(12.dp),
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )

        if (state.errorMessage != null) {
            Spacer(Modifier.height(10.dp))
            Text(state.errorMessage, color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(22.dp))
        Button(
            onClick = { viewModel.register(fullName, email, password, onRegisterSuccess) },
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = CivicNavy),
            shape = RoundedCornerShape(14.dp)
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
            } else {
                Text("Create account", fontWeight = FontWeight.SemiBold)
            }
        }

        Spacer(Modifier.height(12.dp))
        Text(
            "Note: registration always creates a citizen account, per the CivicAI API. " +
                "Staff accounts are promoted separately by an administrator.",
            color = TextSecondary,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
