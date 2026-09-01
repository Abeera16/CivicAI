package com.civicai.app.ui.screens.report

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.civicai.app.ui.components.categoryLabel
import com.civicai.app.ui.theme.*
import com.civicai.app.util.createImageCaptureTarget
import com.civicai.app.util.copyUriToCacheFile
import com.civicai.app.util.rememberLocationState
import com.civicai.app.util.viewModelFactory

@Composable
fun ReportScreen(
    onClose: () -> Unit,
    onSubmitted: () -> Unit
) {
    val context = LocalContext.current
    val viewModel: ReportViewModel = viewModel(factory = viewModelFactory { ReportViewModel(it.reportsRepository) })
    val state = viewModel.uiState
    val locationState = rememberLocationState()

    var pendingCaptureUri by remember { mutableStateOf<Uri?>(null) }
    var useImageUrlMode by remember { mutableStateOf(false) }

    val takePictureLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success) {
            pendingCaptureUri?.let { uri ->
                copyUriToCacheFile(context, uri)?.let { file -> viewModel.setImageFile(file) }
            }
        }
    }
    val pickImageLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { copyUriToCacheFile(context, it)?.let { file -> viewModel.setImageFile(file) } }
    }

    LaunchedEffect(Unit) { locationState.requestPermission() }
    LaunchedEffect(locationState.location) {
        locationState.location?.let { viewModel.setLocation(it.latitude, it.longitude) }
    }
    LaunchedEffect(state.result) {
        if (state.result != null) onSubmitted()
    }

    Column(Modifier.fillMaxSize().background(Color.Black)) {
        // Camera / photo preview area
        Box(Modifier.fillMaxWidth().weight(1f)) {
            when {
                state.imageFile != null -> AsyncImage(
                    model = state.imageFile, contentDescription = null,
                    contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()
                )
                state.imageUrl.isNotBlank() -> AsyncImage(
                    model = state.imageUrl, contentDescription = null,
                    contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()
                )
                else -> Box(
                    Modifier.fillMaxSize().background(Color(0xFF1C1C1E)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.CameraAlt, null, tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(8.dp))
                        Text("No photo yet", color = Color.White.copy(alpha = 0.6f))
                    }
                }
            }

            IconButton(onClick = onClose, modifier = Modifier.padding(12.dp).background(Color.Black.copy(alpha = 0.4f), CircleShape)) {
                Icon(Icons.Default.Close, null, tint = Color.White)
            }

            // GPS status pill
            Row(
                Modifier
                    .align(Alignment.BottomStart)
                    .padding(12.dp)
                    .background(Color.Black.copy(alpha = 0.55f), RoundedCornerShape(20.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.LocationOn, null, tint = CivicTeal, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(6.dp))
                Text(
                    if (state.lat != null) "Location locked" else "Locating…",
                    color = Color.White, fontSize = 12.sp
                )
            }
        }

        // Bottom sheet-style form
        Column(
            Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.background, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .padding(20.dp)
        ) {
            // Camera / gallery / URL controls
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = {
                    val (_, uri) = createImageCaptureTarget(context)
                    pendingCaptureUri = uri
                    takePictureLauncher.launch(uri)
                }, shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Default.CameraAlt, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp)); Text("Camera")
                }
                OutlinedButton(onClick = { pickImageLauncher.launch("image/*") }, shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Default.PhotoLibrary, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp)); Text("Gallery")
                }
                OutlinedButton(onClick = { useImageUrlMode = !useImageUrlMode }, shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Default.Link, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp)); Text("URL")
                }
            }

            if (useImageUrlMode) {
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = state.imageUrl,
                    onValueChange = { viewModel.setImageUrl(it) },
                    placeholder = { Text("https://…jpg") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(Modifier.height(14.dp))
            Text("Category (optional hint)", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
            Spacer(Modifier.height(8.dp))
            Row(
                Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                REPORT_CATEGORIES.forEach { cat ->
                    FilterChip(
                        selected = state.category == cat,
                        onClick = { viewModel.setCategory(cat) },
                        label = { Text(categoryLabel(cat)) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = CivicTeal.copy(alpha = 0.3f))
                    )
                }
            }

            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                value = state.description,
                onValueChange = { viewModel.setDescription(it) },
                placeholder = { Text("Describe the problem…") },
                shape = RoundedCornerShape(12.dp),
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            if (state.errorMessage != null) {
                Spacer(Modifier.height(8.dp))
                Text(state.errorMessage, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }

            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { viewModel.submit() },
                enabled = !state.isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CivicNavy),
                shape = RoundedCornerShape(14.dp)
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.Upload, null); Spacer(Modifier.width(8.dp)); Text("Submit Report", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
