package com.civicai.app.data.remote.dto

data class ChatRequest(
    val message: String,
    val conversation_id: String? = null
)

data class CitationDto(
    val title: String,
    val url: String,
    val snippet: String,
    val source_type: String
)

data class AgentTraceDto(
    val agent: String,
    val action: String,
    val detail: String
)

/** POST /assistant/chat response */
data class ChatResponseDto(
    val conversation_id: String,
    val answer: String,
    val citations: List<CitationDto> = emptyList(),
    val agent_trace: List<AgentTraceDto> = emptyList()
)

/** A single chat bubble kept client-side for the on-screen transcript. */
data class ChatMessageUi(
    val text: String,
    val isUser: Boolean,
    val citations: List<CitationDto> = emptyList()
)
