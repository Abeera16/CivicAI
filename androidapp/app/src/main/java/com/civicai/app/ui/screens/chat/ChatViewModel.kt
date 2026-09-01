package com.civicai.app.ui.screens.chat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.civicai.app.data.remote.dto.ChatMessageUi
import com.civicai.app.data.repository.AssistantRepository
import com.civicai.app.util.ApiResult
import kotlinx.coroutines.launch

data class ChatUiState(
    val messages: List<ChatMessageUi> = emptyList(),
    val conversationId: String? = null,
    val isSending: Boolean = false,
    val errorMessage: String? = null
)

val SUGGESTED_PROMPTS = listOf(
    "How do I report a pothole?",
    "Any flooding near me?",
    "What does my report status mean?",
    "Report a broken streetlight"
)

class ChatViewModel(private val assistantRepository: AssistantRepository) : ViewModel() {

    var uiState by mutableStateOf(ChatUiState())
        private set

    fun send(message: String) {
        if (message.isBlank()) return
        uiState = uiState.copy(
            messages = uiState.messages + ChatMessageUi(message, isUser = true),
            isSending = true,
            errorMessage = null
        )
        viewModelScope.launch {
            when (val result = assistantRepository.sendMessage(message, uiState.conversationId)) {
                is ApiResult.Success -> uiState = uiState.copy(
                    messages = uiState.messages + ChatMessageUi(result.data.answer, isUser = false, citations = result.data.citations),
                    conversationId = result.data.conversation_id,
                    isSending = false
                )
                is ApiResult.Error -> uiState = uiState.copy(isSending = false, errorMessage = result.message)
            }
        }
    }
}
