package com.civicai.app.ui.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.R
import com.civicai.app.ui.theme.CivicNavy
import com.civicai.app.ui.theme.CivicTeal
import com.civicai.app.ui.theme.TextSecondary
import com.civicai.app.util.viewModelFactory

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onGoToRegister: () -> Unit,
    onContinueAsGuest: () -> Unit
) {
    val viewModel: AuthViewModel = viewModel(factory = viewModelFactory { AuthViewModel(it.authRepository) })
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    val state = viewModel.uiState

    Column(
        Modifier.fillMaxSize().padding(horizontal = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(64.dp))
        Icon(painterResource(R.drawable.ic_earth), null, tint = CivicTeal, modifier = Modifier.size(56.dp))
        Spacer(Modifier.height(8.dp))
        Row {
            Text("Civic", color = CivicNavy, fontWeight = FontWeight.Bold, fontSize = 26.sp)
            Text("AI", color = CivicTeal, fontWeight = FontWeight.Bold, fontSize = 26.sp)
        }
        Spacer(Modifier.height(4.dp))
        Text("Your city, one report at a time", color = TextSecondary)

        Spacer(Modifier.height(36.dp))

        LabeledField(label = "Email", value = email, onValueChange = { email = it }, icon = Icons.Default.Email,
            keyboardType = KeyboardType.Email, placeholder = "you@example.com")
        Spacer(Modifier.height(16.dp))
        LabeledField(
            label = "Password", value = password, onValueChange = { password = it }, icon = Icons.Default.Lock,
            placeholder = "••••••••",
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            trailing = {
                IconButton(onClick = { showPassword = !showPassword }) {
                    Icon(if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility, null, tint = TextSecondary)
                }
            }
        )

        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = { /* Not covered by the API doc — hook up if backend adds it */ }) {
                Text("Forgot password?", color = CivicNavy, fontSize = 13.sp)
            }
        }

        if (state.errorMessage != null) {
            Spacer(Modifier.height(4.dp))
            Text(state.errorMessage, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
        }

        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { viewModel.login(email, password, onLoginSuccess) },
            enabled = !state.isLoading,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = CivicNavy),
            shape = RoundedCornerShape(14.dp)
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = androidx.compose.ui.graphics.Color.White, strokeWidth = 2.dp)
            } else {
                Text("Login", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("New here? ", color = TextSecondary)
            TextButton(onClick = onGoToRegister, contentPadding = PaddingValues(0.dp)) {
                Text("Create account", color = CivicTeal, fontWeight = FontWeight.SemiBold)
            }
        }

        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onContinueAsGuest,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            Icon(Icons.Default.Person, null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Continue as guest")
        }

        Spacer(Modifier.height(20.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Shield, null, tint = TextSecondary, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
            Text("Protected by secure JWT sessions", color = TextSecondary, fontSize = 12.sp)
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun LabeledField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    icon: ImageVector,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailing: (@Composable () -> Unit)? = null
) {
    Column(Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder) },
            leadingIcon = { Icon(icon, null, tint = TextSecondary) },
            trailingIcon = trailing,
            singleLine = true,
            visualTransformation = visualTransformation,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        )
    }
}
