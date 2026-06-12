<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Conversation, Message } from '@blinkr/shared'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import MessageInput from '@/components/chat/MessageInput.vue'
import TypingIndicator from '@/components/chat/TypingIndicator.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { useWebSocket } from '@/composables/useWebSocket'

const auth = useAuthStore()
const chat = useChatStore()
const ws = useWebSocket()

const replyTo = ref<Message | null>(null)
const editingId = ref<string | null>(null)
const editText = ref('')
const showMobileSidebar = ref(true)

const demoUsers: Record<string, { name: string; avatar: string | null }> = {
  u1: { name: 'Jordan', avatar: null },
  u2: { name: 'Sam', avatar: null },
  u3: { name: 'Riley', avatar: null },
}

onMounted(async () => {
  await auth.fetchMe()
  chat.connect()
  try {
    await chat.loadConversations()
  } catch {
    seedDemoData()
  }
  if (chat.conversations.length) {
    chat.selectConversation(chat.conversations[0].id)
    showMobileSidebar.value = false
  }
})

function seedDemoData() {
  const now = new Date().toISOString()
  chat.conversations = [
    {
      id: 'demo-1',
      type: 'direct',
      name: null,
      iconUrl: null,
      memberIds: [auth.user?.id ?? 'me', 'u1'],
      lastMessageAt: now,
      createdAt: now,
    },
    {
      id: 'demo-2',
      type: 'group',
      name: 'Squad 🎮',
      iconUrl: null,
      memberIds: [auth.user?.id ?? 'me', 'u2', 'u3'],
      lastMessageAt: now,
      createdAt: now,
    },
  ] as Conversation[]

  chat.messages['demo-1'] = [
    {
      id: 'm1',
      conversationId: 'demo-1',
      senderId: 'u1',
      content: 'yo you coming tonight??',
      type: 'text',
      reactions: [{ emoji: '🔥', userIds: ['me'] }],
      editedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'm2',
      conversationId: 'demo-1',
      senderId: auth.user?.id ?? 'me',
      content: 'yeah for sure, what time?',
      type: 'text',
      reactions: [],
      editedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 3500000).toISOString(),
    },
    {
      id: 'm3',
      conversationId: 'demo-1',
      senderId: 'u1',
      content: '8pm. bring snacks 🍿',
      type: 'text',
      reactions: [{ emoji: '👍', userIds: ['me', 'u1'] }],
      editedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 3400000).toISOString(),
    },
  ] as Message[]

  chat.messages['demo-2'] = [
    {
      id: 'm4',
      conversationId: 'demo-2',
      senderId: 'u2',
      content: 'new map drops today',
      type: 'text',
      reactions: [],
      editedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'm5',
      conversationId: 'demo-2',
      senderId: 'u3',
      content: 'lets run it after school',
      type: 'text',
      reactions: [{ emoji: '❤️', userIds: ['u2'] }],
      editedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 7100000).toISOString(),
    },
  ] as Message[]
}

function getDisplayName(c: Conversation) {
  if (c.type === 'group') return c.name ?? 'Group chat'
  const other = c.memberIds.find((id) => id !== auth.user?.id)
  return other ? demoUsers[other]?.name ?? other : 'Chat'
}

function getAvatarUrl(c: Conversation) {
  if (c.type === 'group') return c.iconUrl
  const other = c.memberIds.find((id) => id !== auth.user?.id)
  return other ? demoUsers[other]?.avatar ?? null : null
}

function getPreview(c: Conversation) {
  const msgs = chat.messages[c.id]
  const last = msgs?.[msgs.length - 1]
  if (!last) return ''
  if (last.deletedAt) return 'Message deleted'
  if (last.type === 'image') return '📷 Photo'
  return last.content
}

function getSenderName(id: string) {
  if (id === auth.user?.id) return auth.user.displayName
  return demoUsers[id]?.name ?? id
}

function getSenderAvatar(id: string) {
  if (id === auth.user?.id) return auth.user.avatarUrl
  return demoUsers[id]?.avatar ?? null
}

const typingNames = computed(() =>
  chat.activeTypingUsers
    .filter((id) => id !== auth.user?.id)
    .map((id) => getSenderName(id)),
)

function onSelect(id: string) {
  chat.selectConversation(id)
  showMobileSidebar.value = false
}

function onSend(content: string, replyToId?: string) {
  if (editingId.value) {
    chat.editMessage(editingId.value, content)
    editingId.value = null
    editText.value = ''
    return
  }
  chat.sendMessage(content, replyToId)
  replyTo.value = null
}

function onSendImage(file: File) {
  chat.sendImage(file)
}

function onTyping(isTyping: boolean) {
  if (chat.activeConversationId) {
    ws.setTyping(chat.activeConversationId, isTyping)
  }
}

function startEdit(msg: Message) {
  editingId.value = msg.id
  editText.value = msg.content
}

function shouldShowAvatar(messages: Message[], index: number) {
  if (index === messages.length - 1) return true
  return messages[index + 1]?.senderId !== messages[index].senderId
}
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-surface-light dark:bg-surface-dark">
    <div
      class="absolute inset-0 z-20 md:relative md:z-auto md:flex md:shrink-0"
      :class="showMobileSidebar ? 'flex' : 'hidden md:flex'"
    >
      <ChatSidebar
        :conversations="chat.conversations"
        :active-id="chat.activeConversationId"
        :get-display-name="getDisplayName"
        :get-avatar-url="getAvatarUrl"
        :get-preview="getPreview"
        @select="onSelect"
      />
    </div>

    <main class="flex min-w-0 flex-1 flex-col">
      <template v-if="chat.activeConversation">
        <header class="flex items-center gap-3 border-b border-border-light bg-panel-light/80 px-4 py-3 backdrop-blur-xl dark:border-border-dark dark:bg-panel-dark/80">
          <button
            type="button"
            class="md:hidden flex h-9 w-9 items-center justify-center rounded-xl hover:bg-elevated-light dark:hover:bg-elevated-dark"
            @click="showMobileSidebar = true"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Avatar
            :src="getAvatarUrl(chat.activeConversation)"
            :name="getDisplayName(chat.activeConversation)"
            size="sm"
            online
          />
          <div class="min-w-0 flex-1">
            <h1 class="truncate font-semibold">{{ getDisplayName(chat.activeConversation) }}</h1>
            <p class="text-xs text-emerald-500">Active now</p>
          </div>
        </header>

        <div class="scrollbar-thin flex-1 overflow-y-auto py-4">
          <TransitionGroup name="message" tag="div" class="flex flex-col gap-1">
            <MessageBubble
              v-for="(msg, i) in chat.activeMessages"
              :key="msg.id"
              :message="msg"
              :is-own="msg.senderId === auth.user?.id"
              :sender-name="getSenderName(msg.senderId)"
              :sender-avatar="getSenderAvatar(msg.senderId)"
              :reply-to="msg.replyToId ? chat.activeMessages.find(m => m.id === msg.replyToId) ?? null : null"
              :show-avatar="shouldShowAvatar(chat.activeMessages, i)"
              @react="(emoji) => chat.reactToMessage(msg.id, emoji)"
              @reply="replyTo = msg"
              @edit="startEdit(msg)"
              @delete="chat.deleteMessage(msg.id)"
            />
          </TransitionGroup>
          <TypingIndicator v-if="typingNames.length" :names="typingNames" />
        </div>

        <MessageInput
          :reply-to="replyTo"
          @send="onSend"
          @send-image="onSendImage"
          @typing="onTyping"
          @cancel-reply="replyTo = null"
        />
      </template>

      <div
        v-else
        class="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <div class="gradient-brand flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl shadow-blink-600/30">
          <svg class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold">Select a chat</h2>
        <p class="max-w-sm text-text-secondary-light dark:text-text-secondary-dark">
          Pick a conversation from the sidebar or add friends to start messaging.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.message-enter-active {
  transition: all 0.25s ease;
}
.message-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
</style>
