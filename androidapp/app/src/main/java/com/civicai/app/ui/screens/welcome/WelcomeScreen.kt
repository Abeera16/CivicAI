package com.civicai.app.ui.screens.welcome

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.civicai.app.R
import com.civicai.app.ui.theme.CivicNavy
import com.civicai.app.ui.theme.CivicTeal
import com.civicai.app.ui.theme.TextSecondary

@Composable
fun WelcomeScreen(
    onNext: () -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(56.dp))

        // Brand mark
        Box(
            Modifier
                .size(96.dp)
                .clip(RoundedCornerShape(26.dp))
                .background(CivicTeal),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                painterResource(R.drawable.ic_earth),
                contentDescription = null,
                tint = CivicNavy,
                modifier = Modifier.size(52.dp)
            )
        }
        Spacer(Modifier.height(16.dp))
        Row {
            Text("Civic", color = CivicNavy, fontWeight = FontWeight.Bold, fontSize = 28.sp)
            Text("AI", color = CivicTeal, fontWeight = FontWeight.Bold, fontSize = 28.sp)
        }

        Spacer(Modifier.height(48.dp))
        Text(
            "Report problems in seconds",
            style = MaterialTheme.typography.titleLarge,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Snap a photo — GPS and category are handled for you.",
            style = MaterialTheme.typography.bodyLarge,
            color = TextSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.weight(1f))

        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = CivicNavy, contentColor = Color.White),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text("Next", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
        Spacer(Modifier.height(20.dp))
    }
}
