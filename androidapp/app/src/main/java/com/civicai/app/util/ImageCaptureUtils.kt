package com.civicai.app.util

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Creates a fresh cache file + content:// Uri for CameraX/ActivityResult TakePicture to write into. */
fun createImageCaptureTarget(context: Context): Pair<File, Uri> {
    val imagesDir = File(context.cacheDir, "images").apply { mkdirs() }
    val fileName = "report_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.jpg"
    val file = File(imagesDir, fileName)
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    return file to uri
}

/** File extension matching each type the backend's ALLOWED_IMAGE_TYPES accepts. Falls back to .jpg. */
private fun extensionForMimeType(mimeType: String?): String = when (mimeType) {
    "image/png" -> ".png"
    "image/webp" -> ".webp"
    "image/heic" -> ".heic"
    "image/jpeg" -> ".jpg"
    else -> ".jpg"
}

/**
 * Resolves a content:// Uri (e.g. from a gallery picker) down to a local File for multipart upload.
 * Detects the picked file's *real* MIME type via the ContentResolver (rather than assuming JPEG)
 * and names the cache file with a matching extension, so [reportImageMediaType] can report the
 * correct Content-Type later instead of mislabeling e.g. a PNG as image/jpeg.
 */
fun copyUriToCacheFile(context: Context, uri: Uri): File? {
    return try {
        val mimeType = context.contentResolver.getType(uri)
        val imagesDir = File(context.cacheDir, "images").apply { mkdirs() }
        val fileName = "picked_${System.currentTimeMillis()}${extensionForMimeType(mimeType)}"
        val outFile = File(imagesDir, fileName)
        context.contentResolver.openInputStream(uri)?.use { input ->
            outFile.outputStream().use { output -> input.copyTo(output) }
        }
        outFile
    } catch (e: Exception) {
        null
    }
}

/** Maps a cache file's extension back to a concrete Content-Type for the multipart upload. */
fun reportImageMediaType(file: File): String = when (file.extension.lowercase()) {
    "png" -> "image/png"
    "webp" -> "image/webp"
    "heic" -> "image/heic"
    else -> "image/jpeg"
}
