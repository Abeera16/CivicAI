package com.civicai.app.util

import com.google.gson.Gson
import retrofit2.Response
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val code: Int?, val message: String) : ApiResult<Nothing>()
}

/** Wraps a Retrofit [Response] into [ApiResult], surfacing HTTP status + backend error body. */
suspend fun <T> safeApiCall(block: suspend () -> Response<T>): ApiResult<T> {
    return try {
        val response = block()
        if (response.isSuccessful) {
            val body = response.body()
            if (body != null) ApiResult.Success(body)
            else ApiResult.Error(response.code(), "Empty response body")
        } else {
            val errorText = response.errorBody()?.string()
            val message = parseErrorDetail(errorText) ?: "Request failed (HTTP ${response.code()})"
            ApiResult.Error(response.code(), message)
        }
    } catch (e: UnknownHostException) {
        ApiResult.Error(null, "Can't reach the server. Check your network/base URL.")
    } catch (e: ConnectException) {
        ApiResult.Error(null, "Connection refused. Is the backend server running?")
    } catch (e: SocketTimeoutException) {
        ApiResult.Error(null, "The server took too long to respond.")
    } catch (e: Exception) {
        ApiResult.Error(null, e.message ?: "Unexpected error")
    }
}

private fun parseErrorDetail(raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    return try {
        val map = Gson().fromJson(raw, Map::class.java)
        (map["detail"] ?: map["message"])?.toString()
    } catch (e: Exception) {
        raw
    }
}
