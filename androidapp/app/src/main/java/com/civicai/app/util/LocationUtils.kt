package com.civicai.app.util

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.location.Location
import androidx.compose.runtime.*
import androidx.core.content.ContextCompat
import androidx.compose.ui.platform.LocalContext
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.google.accompanist.permissions.isGranted

data class LocationState(
    val location: Location?,
    val permissionGranted: Boolean,
    val requestPermission: () -> Unit,
    val refresh: () -> Unit
)

/**
 * Requests fine/coarse location permission and fetches the device's current
 * location via the Fused Location Provider. Used to auto-fill the GPS pin on
 * the Report screen and to sort/nearby-filter incidents on Home/Nearby.
 * No location is ever fabricated — if permission is denied, [location] stays
 * null and callers should let the user drop a pin manually.
 */
@OptIn(ExperimentalPermissionsApi::class)
@SuppressLint("MissingPermission")
@Composable
fun rememberLocationState(): LocationState {
    val context = LocalContext.current
    var location by remember { mutableStateOf<Location?>(null) }

    val permissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    )

    fun fetch() {
        val granted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) return

        val client = LocationServices.getFusedLocationProviderClient(context)
        client.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, CancellationTokenSource().token)
            .addOnSuccessListener { loc -> location = loc }
    }

    LaunchedEffect(permissionsState.allPermissionsGranted) {
        if (permissionsState.allPermissionsGranted) fetch()
    }

    return LocationState(
        location = location,
        permissionGranted = permissionsState.permissions.any { it.status.isGranted },
        requestPermission = { permissionsState.launchMultiplePermissionRequest() },
        refresh = { fetch() }
    )
}
