package com.civicai.app.ui.screens.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.civicai.app.data.remote.dto.ChatMessageUi
import com.civicai.app.ui.theme.*
import com.civicai.app.util.viewModelFactory
import kotlinx.coroutines.launch

@Composable
fun ChatScreen() {
    val viewModel: ChatViewModel = viewModel(factory = viewModelFactory { ChatViewModel(it.assistantRepository) })
    val state = viewModel.uiState
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.size - 1)
    }

    Column(Modifier.fillMaxSize()) {
        // Header
        Row(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier.size(38.dp).clip(CircleShape).background(CivicTeal.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) { Icon(Icons.Default.HealthAndSafety, null, tint = CivicTeal, modifier = Modifier.size(20.dp)) }
            Spacer(Modifier.width(10.dp))
            Column {
                Text("Ask CivicAI", fontWeight = FontWeight.Bold)
            }
        }
        HorizontalDivider(color = Divider)

        if (state.messages.isEmpty()) {
            Column(Modifier.padding(16.dp)) {
                AssistantBubble(ChatMessageUi("Salam! Ask me anything about reporting or your city.", isUser = false))
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SUGGESTED_PROMPTS.take(2).forEach { prompt ->
                        SuggestionChip(prompt, Modifier.weight(1f)) { viewModel.send(prompt) }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SUGGESTED_PROMPTS.drop(2).forEach { prompt ->
                        SuggestionChip(prompt, Modifier.weight(1f)) { viewModel.send(prompt) }
                    }
                }
            }
        }

        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(state.messages) { msg ->
                if (msg.isUser) UserBubble(msg) else AssistantBubble(msg)
            }
            if (state.isSending) item { TypingIndicator() }
            if (state.errorMessage != null) item {
                Text(state.errorMessage, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }
        }

        // Input bar
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                placeholder = { Text("Type or hold to speak…") },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(24.dp),
                singleLine = true
            )
            Spacer(Modifier.width(8.dp))
            IconButton(
                onClick = {
                    val text = input
                    if (text.isNotBlank()) {
                        input = ""
                        viewModel.send(text)
                    }
                },
                modifier = Modifier.size(48.dp).clip(CircleShape).background(CivicTeal)
            ) {
                Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.White)
            }
        }
    }
}

@Composable
private fun UserBubble(msg: ChatMessageUi) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
        Box(
            Modifier
                .widthIn(max = 280.dp)
                .background(CivicNavy, RoundedCornerShape(16.dp, 4.dp, 16.dp, 16.dp))
                .padding(horizontal = 14.dp, vertical = 10.dp)
        ) { Text(msg.text, color = Color.White) }
    }
}

@Composable
private fun AssistantBubble(msg: ChatMessageUi) {
    Row(Modifier.fillMaxWidth()) {
        Column(
            Modifier
                .widthIn(max = 300.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp, 16.dp, 16.dp, 16.dp))
                .padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
            Text(msg.text)
            if (msg.citations.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                msg.citations.forEach { citation ->
                    Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.padding(top = 4.dp)) {
                        Column(Modifier.padding(10.dp)) {
                            Text(citation.title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            if (citation.snippet.isNotBlank()) {
                                Text(citation.snippet, fontSize = 12.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TypingIndicator() {
    Row(Modifier.fillMaxWidth()) {
        Box(
            Modifier
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp, 16.dp, 16.dp, 16.dp))
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) { Text("CivicAI is thinking…", color = TextSecondary, fontSize = 13.sp) }
    }
}

@Composable
private fun SuggestionChip(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .clickable(onClick = onClick)
            .background(CivicNavy.copy(alpha = 0.06f), RoundedCornerShape(12.dp))
            .padding(10.dp)
    ) {
        Text(text, fontSize = 12.sp, color = CivicNavy)
    }
}
