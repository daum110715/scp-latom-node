<script setup lang="ts">
import { ref } from 'vue'
import { useAiChat } from '@/composables/useAiChat'
import AiMessageBubble from '@/components/ai/AiMessageBubble.vue'

const {
  t,
  conversations,
  currentId,
  messages,
  inputText,
  isStreaming,
  messagesEl,
  loadConversations,
  selectConversation: baseSelectConversation,
  newConversation: baseNewConversation,
  handleDelete: baseHandleDelete,
  sendMessage,
  handleKeydown,
} = useAiChat()

// Mobile-specific: list/chat view toggle
const showList = ref(true)

function selectConversation(id: string) {
  baseSelectConversation(id)
  showList.value = false
}

function newConversation() {
  baseNewConversation()
  showList.value = false
}

function backToList() {
  if (isStreaming.value) return
  showList.value = true
  loadConversations()
}

async function handleDelete(id: string) {
  await baseHandleDelete(id)
  if (currentId.value === null) {
    showList.value = true
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="m-chat">
    <!-- Conversation List View -->
    <template v-if="showList">
      <div class="m-chat-header">
        <h3>{{ t('ai.conversations') }}</h3>
      </div>

      <button class="m-new-btn" @click="newConversation">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {{ t('ai.newConversation') }}
      </button>

      <div v-if="conversations.length > 0" class="m-conv-items">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="m-conv-item"
          @click="selectConversation(conv.id)"
        >
          <div class="m-conv-info">
            <span class="m-conv-title">{{ conv.title }}</span>
            <span class="m-conv-meta"
              >{{ conv.messageCount }} msgs · {{ formatTime(conv.lastMessageAt) }}</span
            >
          </div>
          <button class="m-conv-delete" @click.stop="handleDelete(conv.id)">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>

      <div v-else class="m-empty">
        {{ t('ai.noConversations') }}
      </div>
    </template>

    <!-- Chat View -->
    <template v-else>
      <div class="m-chat-header">
        <button class="m-back-btn" @click="backToList">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span class="m-chat-title">{{
          currentId
            ? (conversations.find((c) => c.id === currentId)?.title ?? t('ai.title'))
            : t('ai.newConversation')
        }}</span>
      </div>

      <div ref="messagesEl" class="m-messages">
        <div v-if="messages.length === 0" class="m-empty-chat">
          <p>{{ t('ai.title') }}</p>
        </div>

        <AiMessageBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          :streaming="msg.id === 'streaming' && isStreaming"
        />
      </div>

      <div class="m-input-bar">
        <textarea
          v-model="inputText"
          :placeholder="t('ai.placeholder')"
          rows="1"
          :disabled="isStreaming"
          @keydown="handleKeydown"
          @input="
            (e: any) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }
          "
        />
        <button
          class="m-send-btn"
          :disabled="!inputText.trim() || isStreaming"
          @click="sendMessage"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.m-chat {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-height: 400px;
}

.m-chat-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.m-chat-header h3 {
  font-size: var(--text-base);
  font-weight: 600;
}

.m-chat-title {
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
}

.m-new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  margin: var(--space-md);
  background: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

.m-conv-items {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--space-md) var(--space-md);
}

.m-conv-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.m-conv-item:active {
  background: var(--bg-elevated);
}

.m-conv-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-conv-title {
  font-size: var(--text-sm);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-conv-meta {
  font-size: 11px;
  color: var(--text-tertiary);
}

.m-conv-delete {
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
}

.m-empty {
  padding: var(--space-xl);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.m-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 200px;
}

.m-empty-chat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.m-input-bar {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.m-input-bar textarea {
  flex: 1;
  resize: none;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 16px; /* prevent iOS zoom */
  font-family: inherit;
  line-height: 1.5;
  min-height: 40px;
  max-height: 100px;
}

.m-input-bar textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.m-send-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  flex-shrink: 0;
}

.m-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
