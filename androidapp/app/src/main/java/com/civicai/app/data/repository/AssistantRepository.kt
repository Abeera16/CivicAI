package com.civicai.app.data.repository

import com.civicai.app.data.remote.CivicAiApiService
import com.civicai.app.data.remote.dto.ChatRequest
import com.civicai.app.data.remote.dto.ChatResponseDto
import com.civicai.app.util.ApiResult
import com.civicai.app.util.safeApiCall

class AssistantRepository(private val api: CivicAiApiService) {

    /** POST /assistant/chat */
    suspend fun sendMessage(message: String, conversationId: String?): ApiResult<ChatResponseDto> =
        safeApiCall { api.sendChatMessage(ChatRequest(message, conversationId)) }
}
