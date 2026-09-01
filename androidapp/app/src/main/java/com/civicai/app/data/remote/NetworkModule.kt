package com.civicai.app.data.remote

import com.civicai.app.BuildConfig
import com.civicai.app.data.local.TokenManager
import com.civicai.app.data.remote.dto.RefreshRequest
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * - Attaches `Authorization: Bearer <token>` to every request (per API §2.3).
 * - On a 401, calls POST /auth/refresh once and retries the original request
 *   with the new access token (access tokens expire after 60 minutes,
 *   per API §2.4). If refresh also fails, the caller sees the 401 and the
 *   app routes the user back to Sign In.
 */
class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = runBlocking { tokenManager.getAccessToken() }

        val requestBuilder = original.newBuilder()
        if (!token.isNullOrBlank()) {
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }
        var response = chain.proceed(requestBuilder.build())

        if (response.code == 401 && !original.url.encodedPath.endsWith("/auth/refresh")) {
            response.close()
            val newToken = runBlocking { tryRefresh(tokenManager) }
            if (newToken != null) {
                val retried = original.newBuilder()
                    .removeHeader("Authorization")
                    .addHeader("Authorization", "Bearer $newToken")
                    .build()
                response = chain.proceed(retried)
            }
        }
        return response
    }

    private suspend fun tryRefresh(tokenManager: TokenManager): String? {
        val refreshToken = tokenManager.getRefreshToken() ?: return null
        return try {
            val refreshApi = Retrofit.Builder()
                .baseUrl(BuildConfig.CIVICAI_BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .client(OkHttpClient.Builder().build())
                .build()
                .create(CivicAiApiService::class.java)
            val resp = refreshApi.refresh(RefreshRequest(refreshToken))
            if (resp.isSuccessful) {
                val body = resp.body() ?: return null
                tokenManager.saveTokens(body.access_token, body.refresh_token)
                body.access_token
            } else null
        } catch (e: Exception) {
            null
        }
    }
}

object NetworkModule {

    fun provideApiService(tokenManager: TokenManager): CivicAiApiService {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
            else HttpLoggingInterceptor.Level.NONE
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(logging)
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.CIVICAI_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CivicAiApiService::class.java)
    }
}
