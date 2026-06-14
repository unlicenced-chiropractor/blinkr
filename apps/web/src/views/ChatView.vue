<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { Conversation, Message, User } from '@blinkr/shared'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import MessageInput from '@/components/chat/MessageInput.vue'
import TypingIndicator from '@/components/chat/TypingIndicator.vue'
import Avatar from '@/components/ui/Avatar.vue'
import LatencyBadge from '@/components/chat/LatencyBadge.vue'
import { classifyFile, hasFilePayload, isWithinDropZone, readTextFile } from '@/lib/drop-files'

const auth = useAuthStore()
const chat = useChatStore()
const route = useRoute()
const router = useRouter()

const replyTo = ref<Message | null>(null)
const editingMessage = ref<Message | null>(null)
const showMobileSidebar = ref(true)
const userCache = ref<Record<string, User>>({})
const imageUploadError = ref('')
const imageUploading = ref(false)
const sendError = ref('')
const dropDepth = ref(0)
const messageScrollEl = ref<HTMLElement | null>(null)
const dropActive = computed(() => dropDepth.value > 0)
const canAcceptDrop = computed(
  () => chat.ready && chat.activeConversation && !editingMessage.value && !imageUploading.value,
)

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

function clearTyping() {
  if (chat.activeConversationId) {
    chat.setTyping(chat.activeConversationId, false)
  }
}

onMounted(async () => {
  if (!auth.isAuthenticated) return

  const openId = route.query.conversation as string | undefined
  await chat.initialize({ conversationId: openId })

  if (openId) {
    showMobileSidebar.value = false
    router.replace({ query: {} })
  } else if (chat.activeConversationId) {
    showMobileSidebar.value = false
  }

  cachePeersFromConversations()
  window.addEventListener('pagehide', clearTyping)
})

onBeforeUnmount(clearTyping)
onUnmounted(() => {
  window.removeEventListener('pagehide', clearTyping)
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
    if (c.members) {
      for (const m of c.members) {
        userCache.value[m.id] = {
          id: m.id,
          username: m.username,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          createdAt: '',
        }
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
  if (!last) return c.type === 'group' ? `${c.memberIds.length} members` : ''
  if (last.deletedAt) return 'Message deleted'
  if (last.type === 'image') {
    const label = '📷 Photo'
    if (c.type === 'group' && last.senderId !== auth.user?.id) {
      return `${getSenderName(last.senderId)}: ${label}`
    }
    return label
  }
  if (c.type === 'group' && last.senderId !== auth.user?.id) {
    return `${getSenderName(last.senderId)}: ${last.content}`
  }
  return last.content
}

function getSenderName(id: string) {
  if (id === auth.user?.id) return auth.user.displayName
  return userCache.value[id]?.displayName
    ?? chat.activeConversation?.members?.find((m) => m.id === id)?.displayName
    ?? chat.conversations.flatMap((c) => c.members ?? (c.peer ? [c.peer] : [])).find((p) => p.id === id)?.displayName
    ?? 'User'
}

function getSenderAvatar(id: string) {
  if (id === auth.user?.id) return auth.user.avatarUrl
  return userCache.value[id]?.avatarUrl
    ?? chat.activeConversation?.members?.find((m) => m.id === id)?.avatarUrl
    ?? chat.conversations.flatMap((c) => c.members ?? (c.peer ? [c.peer] : [])).find((p) => p.id === id)?.avatarUrl
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

function scrollMessagesToBottom(behavior: ScrollBehavior = 'auto') {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = messageScrollEl.value
      if (!el) return
      el.scrollTo({ top: el.scrollHeight, behavior })
    })
  })
}

watch(
  () => [chat.activeConversationId, chat.activeMessages.at(-1)?.id] as const,
  (current, previous) => {
    const [convId, lastId] = current
    if (!convId) return
    const isNewMessage = previous?.[0] === convId && lastId !== previous[1]
    scrollMessagesToBottom(isNewMessage ? 'smooth' : 'auto')
  },
  { flush: 'post' },
)

async function handleSend(content: string, replyToId?: string) {
  sendError.value = ''
  try {
    await chat.sendMessage(content, replyToId)
    replyTo.value = null
  } catch (err) {
    sendError.value = err instanceof Error ? err.message : 'Failed to send message'
    throw err
  }
}

function onSaveEdit(content: string) {
  if (editingMessage.value) {
    chat.editMessage(editingMessage.value.id, content)
    editingMessage.value = null
  }
}

async function onSendImage(file: File) {
  imageUploadError.value = ''
  imageUploading.value = true
  try {
    await chat.sendImage(file)
  } catch (err) {
    imageUploadError.value = err instanceof Error ? err.message : 'Image upload failed'
  } finally {
    imageUploading.value = false
  }
}

function onDragEnter(e: DragEvent) {
  if (!canAcceptDrop.value || !hasFilePayload(e.dataTransfer)) return
  if (isWithinDropZone(e)) return
  e.preventDefault()
  dropDepth.value++
}

function onDragLeave(e: DragEvent) {
  if (!canAcceptDrop.value) return
  if (isWithinDropZone(e)) return
  e.preventDefault()
  dropDepth.value = Math.max(0, dropDepth.value - 1)
}

function onDragOver(e: DragEvent) {
  if (!hasFilePayload(e.dataTransfer)) return
  e.preventDefault()
  if (canAcceptDrop.value && e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

async function onDrop(e: DragEvent) {
  dropDepth.value = 0
  e.preventDefault()
  if (!canAcceptDrop.value) return
  const files = [...e.dataTransfer?.files ?? []]
  if (!files.length) return
  await handleDroppedFiles(files)
}

async function handleDroppedFiles(files: File[]) {
  sendError.value = ''
  imageUploadError.value = ''
  const unsupported: string[] = []

  for (const file of files) {
    const kind = classifyFile(file)
    try {
      if (kind === 'image') {
        await onSendImage(file)
      } else if (kind === 'text') {
        const content = await readTextFile(file)
        await handleSend(content)
      } else {
        unsupported.push(file.name)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send file'
      imageUploadError.value = `${file.name}: ${msg}`
    }
  }

  if (unsupported.length) {
    imageUploadError.value = `Unsupported: ${unsupported.join(', ')} (try images or text files)`
  }
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
  if (chat.activeConversation?.type === 'group') return false
  if (!chat.activeConversationId || !peerId.value) return false
  return chat.isMessageSeen(chat.activeConversationId, msg.id, peerId.value)
}

function onGroupCreated(id: string) {
  cachePeersFromConversations()
  void chat.selectConversation(id).then(() => {
    showMobileSidebar.value = false
  })
}
</script>

<template>
  <div class="app-shell flex h-dvh overflow-hidden">
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
        @group-created="onGroupCreated"
      />
    </div>

    <main class="flex min-w-0 flex-1 flex-col">
      <div
        v-if="!chat.ready"
        class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-blink-500 border-t-transparent" />
        <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Connecting and loading chats…
        </p>
      </div>

      <template v-else-if="chat.activeConversation">
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
              v-if="chat.activeConversation.type === 'group'"
              class="text-xs text-text-secondary-light dark:text-text-secondary-dark"
            >
              {{ chat.activeConversation.memberIds.length }} members
            </p>
            <p
              v-else-if="chat.activeConversation.peer"
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
          <div class="flex items-center gap-1 md:hidden">
            <RouterLink
              to="/friends"
              class="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary-light hover:bg-elevated-light dark:text-text-secondary-dark dark:hover:bg-elevated-dark"
              title="Friends"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </RouterLink>
            <RouterLink
              to="/settings"
              class="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary-light hover:bg-elevated-light dark:text-text-secondary-dark dark:hover:bg-elevated-dark"
              title="Settings"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </RouterLink>
          </div>
        </header>

        <div
          class="relative flex min-h-0 flex-1 flex-col"
          @dragenter="onDragEnter"
          @dragleave="onDragLeave"
          @dragover="onDragOver"
          @drop="onDrop"
        >
          <div
            v-if="dropActive"
            class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-blink-500/10 p-6 backdrop-blur-[2px]"
          >
            <div class="rounded-2xl border-2 border-dashed border-blink-500 bg-panel-light/90 px-8 py-6 text-center shadow-lg dark:bg-panel-dark/90">
              <svg class="mx-auto mb-3 h-10 w-10 text-blink-600 dark:text-blink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="font-semibold text-blink-600 dark:text-blink-400">Drop to send</p>
              <p class="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Images or text files (.txt, .md, .json, …)
              </p>
            </div>
          </div>

        <div ref="messageScrollEl" class="scrollbar-thin flex-1 overflow-y-auto py-4">
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
              :show-avatar="chat.activeConversation?.type === 'group'
                ? msg.senderId !== auth.user?.id && (i === 0 || chat.activeMessages[i + 1]?.senderId !== msg.senderId)
                : i === chat.activeMessages.length - 1 || chat.activeMessages[i + 1]?.senderId !== msg.senderId"
              :show-sender-name="chat.activeConversation?.type === 'group'
                && msg.senderId !== auth.user?.id
                && (i === 0 || chat.activeMessages[i - 1]?.senderId !== msg.senderId)"
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

        <p v-if="sendError" class="border-t border-border-light px-4 py-2 text-sm text-red-500 dark:border-border-dark">
          {{ sendError }}
        </p>
        <p v-if="imageUploadError" class="border-t border-border-light px-4 py-2 text-sm text-red-500 dark:border-border-dark">
          {{ imageUploadError }}
        </p>
        <MessageInput
          :reply-to="replyTo"
          :editing-message="editingMessage"
          :disabled="imageUploading"
          :on-send="handleSend"
          @save-edit="onSaveEdit"
          @send-image="onSendImage"
          @typing="onTyping"
          @cancel-reply="replyTo = null"
          @cancel-edit="editingMessage = null"
        />
        </div>
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
