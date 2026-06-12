<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Conversation, Message, User } from '@blinkr/shared'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import MessageInput from '@/components/chat/MessageInput.vue'
import TypingIndicator from '@/components/chat/TypingIndicator.vue'
import Avatar from '@/components/ui/Avatar.vue'
import LatencyBadge from '@/components/chat/LatencyBadge.vue'

const auth = useAuthStore()
const chat = useChatStore()
const route = useRoute()
const router = useRouter()

const replyTo = ref<Message | null>(null)
const editingMessage = ref<Message | null>(null)
const showMobileSidebar = ref(true)
const userCache = ref<Record<string, User>>({})

const peerId = computed(() => chat.activeConversation?.peer?.id)

const lastOwnMessageId = computed(() => {
  const msgs = chat.activeMessages
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].senderId === auth.user?.id && !msgs[i].deletedAt) {
      return msgs[i].id
    }
  }
  return null
})

onMounted(async () => {
  await auth.fetchMe()
  if (!auth.isAuthenticated) return

  chat.connect()
  const apiStart = performance.now()
  await chat.loadConversations()
  chat.lastApiRtt = Math.round(performance.now() - apiStart)

  const openId = route.query.conversation as string | undefined
  if (openId && chat.conversations.some((c) => c.id === openId)) {
    chat.selectConversation(openId)
    showMobileSidebar.value = false
    router.replace({ query: {} })
  } else if (chat.conversations.length) {
    chat.selectConversation(chat.conversations[0].id)
    showMobileSidebar.value = false
  }

  cachePeersFromConversations()
})

function cachePeersFromConversations() {
  for (const c of chat.conversations) {
    if (c.peer) {
      userCache.value[c.peer.id] = {
        id: c.peer.id,
        username: c.peer.username,
        displayName: c.peer.displayName,
        avatarUrl: c.peer.avatarUrl,
        createdAt: '',
      }
    }
  }
}

function getDisplayName(c: Conversation) {
  if (c.type === 'group') return c.name ?? 'Group chat'
  return c.peer?.displayName ?? 'Chat'
}

function getAvatarUrl(c: Conversation) {
  if (c.type === 'group') return c.iconUrl
  return c.peer?.avatarUrl ?? null
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
  return userCache.value[id]?.displayName ?? chat.conversations
    .flatMap((c) => (c.peer ? [c.peer] : []))
    .find((p) => p.id === id)?.displayName ?? 'User'
}

function getSenderAvatar(id: string) {
  if (id === auth.user?.id) return auth.user.avatarUrl
  return userCache.value[id]?.avatarUrl
    ?? chat.conversations.flatMap((c) => (c.peer ? [c.peer] : [])).find((p) => p.id === id)?.avatarUrl
    ?? null
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
  chat.sendMessage(content, replyToId)
  replyTo.value = null
}

function onSaveEdit(content: string) {
  if (editingMessage.value) {
    chat.editMessage(editingMessage.value.id, content)
    editingMessage.value = null
  }
}

function onSendImage(file: File) {
  chat.sendImage(file)
}

function onTyping(isTyping: boolean) {
  if (chat.activeConversationId) {
    chat.setTyping(chat.activeConversationId, isTyping)
  }
}

function startEdit(msg: Message) {
  replyTo.value = null
  editingMessage.value = msg
}

function isSeen(msg: Message) {
  if (!chat.activeConversationId || !peerId.value) return false
  return chat.isMessageSeen(chat.activeConversationId, msg.id, peerId.value)
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
          />
          <div class="min-w-0 flex-1">
            <h1 class="truncate font-semibold">{{ getDisplayName(chat.activeConversation) }}</h1>
            <p
              v-if="chat.activeConversation.peer"
              class="text-xs text-text-secondary-light dark:text-text-secondary-dark"
            >
              @{{ chat.activeConversation.peer.username }}
            </p>
          </div>
          <LatencyBadge
            :ws-rtt="chat.wsRtt"
            :msg-rtt="chat.lastMessageRtt"
            :api-rtt="chat.lastApiRtt"
          />
        </header>

        <div class="scrollbar-thin flex-1 overflow-y-auto py-4">
          <p
            v-if="!chat.activeMessages.length"
            class="px-4 py-8 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark"
          >
            No messages yet. Say hi!
          </p>
          <TransitionGroup name="message" tag="div" class="flex flex-col gap-1">
            <MessageBubble
              v-for="(msg, i) in chat.activeMessages"
              :key="msg.id"
              :message="msg"
              :is-own="msg.senderId === auth.user?.id"
              :sender-name="getSenderName(msg.senderId)"
              :sender-avatar="getSenderAvatar(msg.senderId)"
              :reply-to="msg.replyToId ? chat.activeMessages.find(m => m.id === msg.replyToId) ?? null : null"
              :reply-to-name="msg.replyToId ? getSenderName(chat.activeMessages.find(m => m.id === msg.replyToId)?.senderId ?? '') : undefined"
              :show-avatar="i === chat.activeMessages.length - 1 || chat.activeMessages[i + 1]?.senderId !== msg.senderId"
              :seen="isSeen(msg)"
              :is-last-own="msg.id === lastOwnMessageId"
              @react="(emoji) => chat.reactToMessage(msg.id, emoji)"
              @reply="replyTo = msg; editingMessage = null"
              @edit="startEdit(msg)"
              @delete="chat.deleteMessage(msg.id)"
            />
          </TransitionGroup>
          <TypingIndicator v-if="typingNames.length" :names="typingNames" />
        </div>

        <MessageInput
          :reply-to="replyTo"
          :editing-message="editingMessage"
          @send="onSend"
          @save-edit="onSaveEdit"
          @send-image="onSendImage"
          @typing="onTyping"
          @cancel-reply="replyTo = null"
          @cancel-edit="editingMessage = null"
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
          Message a friend from the Friends page, or pick a conversation here.
        </p>
        <RouterLink
          to="/friends"
          class="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go to Friends
        </RouterLink>
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
