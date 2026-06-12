import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Conversation, Message, TypingState, UserId } from '@blinkr/shared'
import { useAuthStore } from './auth'
import { useWebSocket } from '@/composables/useWebSocket'
import { api } from '@/lib/api'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const messages = ref<Record<string, Message[]>>({})
  const activeConversationId = ref<string | null>(null)
  const typingUsers = ref<Record<string, UserId[]>>({})
  const readUpTo = ref<Record<string, Message['id']>>({})

  const auth = useAuthStore()
  const ws = useWebSocket()

  const activeConversation = computed(() =>
    conversations.value.find((c) => c.id === activeConversationId.value) ?? null,
  )

  const activeMessages = computed(() =>
    activeConversationId.value ? messages.value[activeConversationId.value] ?? [] : [],
  )

  const activeTypingUsers = computed(() =>
    activeConversationId.value ? typingUsers.value[activeConversationId.value] ?? [] : [],
  )

  async function loadConversations() {
    conversations.value = await api.get<Conversation[]>('/conversations')
  }

  async function loadMessages(conversationId: string) {
    messages.value[conversationId] = await api.get<Message[]>(
      `/conversations/${conversationId}/messages`,
    )
  }

  function selectConversation(id: string) {
    if (activeConversationId.value && activeConversationId.value !== id) {
      ws.unsubscribe(activeConversationId.value)
    }
    activeConversationId.value = id
    ws.subscribe(id)
    if (!messages.value[id]) {
      loadMessages(id)
    }
  }

  async function sendMessage(content: string, replyToId?: string) {
    if (!activeConversationId.value || !content.trim()) return
    const msg = await api.post<Message>(
      `/conversations/${activeConversationId.value}/messages`,
      { content, replyToId },
    )
    appendMessage(msg)
  }

  async function sendImage(file: File, caption?: string) {
    if (!activeConversationId.value) return
    const form = new FormData()
    form.append('image', file)
    if (caption) form.append('caption', caption)
    const msg = await api.upload<Message>(
      `/conversations/${activeConversationId.value}/messages/image`,
      form,
    )
    appendMessage(msg)
  }

  async function editMessage(messageId: string, content: string) {
    if (!activeConversationId.value) return
    const msg = await api.patch<Message>(
      `/conversations/${activeConversationId.value}/messages/${messageId}`,
      { content },
    )
    updateMessage(msg)
  }

  async function deleteMessage(messageId: string) {
    if (!activeConversationId.value) return
    await api.delete(
      `/conversations/${activeConversationId.value}/messages/${messageId}`,
    )
    markDeleted(messageId)
  }

  async function reactToMessage(messageId: string, emoji: string) {
    if (!activeConversationId.value) return
    const msg = await api.post<Message>(
      `/conversations/${activeConversationId.value}/messages/${messageId}/react`,
      { emoji },
    )
    updateMessage(msg)
  }

  function appendMessage(msg: Message) {
    const list = messages.value[msg.conversationId] ?? []
    if (!list.find((m) => m.id === msg.id)) {
      messages.value[msg.conversationId] = [...list, msg]
    }
    const conv = conversations.value.find((c) => c.id === msg.conversationId)
    if (conv) conv.lastMessageAt = msg.createdAt
  }

  function updateMessage(msg: Message) {
    const list = messages.value[msg.conversationId]
    if (!list) return
    const idx = list.findIndex((m) => m.id === msg.id)
    if (idx >= 0) list[idx] = msg
  }

  function markDeleted(messageId: string) {
    if (!activeConversationId.value) return
    const list = messages.value[activeConversationId.value]
    if (!list) return
    const msg = list.find((m) => m.id === messageId)
    if (msg) msg.deletedAt = new Date().toISOString()
  }

  function setTyping(conversationId: string, userId: UserId, isTyping: boolean) {
    const current = typingUsers.value[conversationId] ?? []
    if (isTyping && !current.includes(userId)) {
      typingUsers.value[conversationId] = [...current, userId]
    } else if (!isTyping) {
      typingUsers.value[conversationId] = current.filter((id) => id !== userId)
    }
  }

  function connect() {
    if (!auth.token) return
    ws.connect(auth.token, {
      onMessage: appendMessage,
      onMessageUpdated: updateMessage,
      onMessageDeleted: (messageId, conversationId) => {
        const list = messages.value[conversationId]
        const msg = list?.find((m) => m.id === messageId)
        if (msg) msg.deletedAt = new Date().toISOString()
      },
      onTyping: (state: TypingState) => setTyping(state.conversationId, state.userId, state.isTyping),
      onReadReceipt: (receipt) => {
        readUpTo.value[receipt.userId] = receipt.messageId
      },
    })
  }

  return {
    conversations,
    messages,
    activeConversationId,
    activeConversation,
    activeMessages,
    activeTypingUsers,
    readUpTo,
    loadConversations,
    loadMessages,
    selectConversation,
    sendMessage,
    sendImage,
    editMessage,
    deleteMessage,
    reactToMessage,
    connect,
  }
})
