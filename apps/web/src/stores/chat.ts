import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Conversation, Message, TypingState, UserId } from '@blinkr/shared'
import { useAuthStore } from './auth'
import { useWebSocket } from '@/composables/useWebSocket'
import { api } from '@/lib/api'
import { CHAT_IMAGE_OPTIONS, compressImage } from '@/lib/compress-image'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const messages = ref<Record<string, Message[]>>({})
  const activeConversationId = ref<string | null>(null)
  const typingUsers = ref<Record<string, UserId[]>>({})
  const readReceipts = ref<Record<string, Record<string, string>>>({})
  const ready = ref(false)
  const wsRtt = ref<number | null>(null)
  const lastMessageRtt = ref<number | null>(null)
  const lastApiRtt = ref<number | null>(null)
  let pingSentAt = 0
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let apiPingTimer: ReturnType<typeof setInterval> | null = null
  let wsPingReady = false

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
    const payload = await api.get<{ messages: Message[]; readReceipts: Record<string, string> }>(
      `/conversations/${conversationId}/messages`,
    )
    messages.value[conversationId] = payload.messages
    readReceipts.value[conversationId] = payload.readReceipts
    await markActiveConversationRead()
  }

  async function markActiveConversationRead() {
    const convId = activeConversationId.value
    if (!convId) return
    const msgs = messages.value[convId]
    const last = msgs?.[msgs.length - 1]
    if (!last || last.senderId === auth.user?.id) return

    await markConversationRead(convId, last.id)
  }

  async function markConversationRead(conversationId: string, messageId: string) {
    await api.post(`/conversations/${conversationId}/read`, { messageId })
    if (!readReceipts.value[conversationId]) {
      readReceipts.value[conversationId] = {}
    }
    if (auth.user?.id) {
      readReceipts.value[conversationId][auth.user.id] = messageId
    }
    const conv = conversations.value.find((c) => c.id === conversationId)
    if (conv) conv.unreadCount = 0
  }

  async function selectConversation(id: string) {
    const isSame = activeConversationId.value === id
    if (activeConversationId.value && !isSame) {
      ws.unsubscribe(activeConversationId.value)
    }
    activeConversationId.value = id
    ws.subscribe(id)
    if (!isSame || !messages.value[id]?.length) {
      await loadMessages(id)
    } else {
      await markActiveConversationRead()
    }
  }

  async function initialize(options?: { conversationId?: string }) {
    if (!auth.token) return

    if (ready.value && ws.wsAuthenticated.value) {
      void loadConversations()
      const preferred = options?.conversationId
      if (preferred && preferred !== activeConversationId.value) {
        await selectConversation(preferred)
      }
      return
    }

    ready.value = false

    connect()
    await Promise.all([
      loadConversations(),
      ws.whenAuthenticated(),
    ])

    const preferred = options?.conversationId
    if (preferred && conversations.value.some((c) => c.id === preferred)) {
      await selectConversation(preferred)
    } else if (conversations.value.length) {
      await selectConversation(conversations.value[0].id)
    }

    ready.value = true
    startApiHealthMonitor()
  }

  async function openDirectChat(friendId: string) {
    const conv = await api.post<Conversation>('/conversations/direct', { friendId })
    const existing = conversations.value.find((c) => c.id === conv.id)
    if (!existing) {
      conversations.value = [conv, ...conversations.value]
    } else {
      Object.assign(existing, conv)
    }
    await selectConversation(conv.id)
    return conv
  }

  async function createGroup(name: string, memberIds: string[]) {
    const conv = await api.post<Conversation>('/conversations/group', { name, memberIds })
    conversations.value = [conv, ...conversations.value]
    await selectConversation(conv.id)
    return conv
  }

  async function sendMessage(content: string, replyToId?: string) {
    if (!activeConversationId.value || !content.trim()) {
      throw new Error('No conversation selected')
    }
    const apiStart = performance.now()
    const msg = await api.post<Message>(
      `/conversations/${activeConversationId.value}/messages`,
      { content, replyToId },
    )
    const rtt = Math.round(performance.now() - apiStart)
    lastApiRtt.value = rtt
    lastMessageRtt.value = rtt
    appendMessage(msg)
  }

  async function sendImage(file: File, caption?: string) {
    if (!activeConversationId.value) throw new Error('No conversation selected')
    const compressed = await compressImage(file, CHAT_IMAGE_OPTIONS)
    const form = new FormData()
    form.append('image', compressed)
    if (caption) form.append('caption', caption)
    const apiStart = performance.now()
    const msg = await api.upload<Message>(
      `/conversations/${activeConversationId.value}/messages/image`,
      form,
    )
    const rtt = Math.round(performance.now() - apiStart)
    lastApiRtt.value = rtt
    lastMessageRtt.value = rtt
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
    const isNew = !list.find((m) => m.id === msg.id)
    if (isNew) {
      messages.value[msg.conversationId] = [...list, msg]
      if (msg.senderId !== auth.user?.id) {
        lastMessageRtt.value = Math.max(0, Math.round(Date.now() - new Date(msg.createdAt).getTime()))
        const conv = conversations.value.find((c) => c.id === msg.conversationId)
        if (conv && msg.conversationId !== activeConversationId.value) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1
        }
        if (msg.conversationId === activeConversationId.value) {
          markConversationRead(msg.conversationId, msg.id)
        }
      }
    }
    const conv = conversations.value.find((c) => c.id === msg.conversationId)
    if (conv) {
      conv.lastMessageAt = msg.createdAt
      conversations.value = [
        conv,
        ...conversations.value.filter((c) => c.id !== msg.conversationId),
      ]
    }
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

  function isMessageSeen(conversationId: string, messageId: string, peerId: string | undefined): boolean {
    if (!peerId) return false
    const peerReadId = readReceipts.value[conversationId]?.[peerId]
    if (!peerReadId) return false
    const msgs = messages.value[conversationId] ?? []
    const msgIdx = msgs.findIndex((m) => m.id === messageId)
    const readIdx = msgs.findIndex((m) => m.id === peerReadId)
    if (msgIdx < 0 || readIdx < 0) return peerReadId === messageId
    return readIdx >= msgIdx
  }

  function startLatencyMonitor() {
    if (pingTimer) return
    const ping = () => {
      if (!ws.wsAuthenticated.value) return
      pingSentAt = performance.now()
      ws.ping()
    }
    wsPingReady = true
    ping()
    pingTimer = setInterval(ping, 5000)
  }

  function startApiHealthMonitor() {
    if (apiPingTimer) return
    const ping = async () => {
      const start = performance.now()
      try {
        await api.get<{ ok: boolean }>('/health')
        lastApiRtt.value = Math.round(performance.now() - start)
      } catch {
        // keep last reading on transient failures
      }
    }
    ping()
    apiPingTimer = setInterval(ping, 30000)
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
        const convId = receipt.conversationId ?? activeConversationId.value
        if (!convId) return
        if (!readReceipts.value[convId]) readReceipts.value[convId] = {}
        readReceipts.value[convId][receipt.userId] = receipt.messageId
      },
      onPong: () => {
        if (pingSentAt) {
          wsRtt.value = Math.round(performance.now() - pingSentAt)
          pingSentAt = 0
        }
      },
      onAuthenticated: () => {
        if (!wsPingReady) startLatencyMonitor()
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
    readReceipts,
    ready,
    wsRtt,
    lastMessageRtt,
    lastApiRtt,
    loadConversations,
    loadMessages,
    initialize,
    openDirectChat,
    createGroup,
    selectConversation,
    sendMessage,
    sendImage,
    editMessage,
    deleteMessage,
    reactToMessage,
    isMessageSeen,
    connect,
    setTyping: (conversationId: string, isTyping: boolean) => ws.setTyping(conversationId, isTyping),
  }
})
