import { ref } from 'vue'
import type { Message, TypingState, WsClientMessage, WsServerMessage } from '@blinkr/shared'

const WS_URL = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`

interface WsHandlers {
  onMessage: (msg: Message) => void
  onMessageUpdated: (msg: Message) => void
  onMessageDeleted: (messageId: string, conversationId: string) => void
  onTyping: (state: TypingState) => void
  onReadReceipt: (receipt: { userId: string; messageId: string; readAt: string; conversationId?: string }) => void
  onPong?: () => void
  onAuthenticated?: () => void
}

// Singleton — one socket shared across the whole app
let socket: WebSocket | null = null
let handlers: WsHandlers | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let token: string | null = null
let isAuthenticated = false
let authWaiters: Array<(ok: boolean) => void> = []
const subscribed = new Set<string>()
const pendingSubscribe = new Set<string>()

const isConnected = ref(false)
const wsAuthenticated = ref(false)

function resolveAuthWaiters(ok: boolean) {
  for (const resolve of authWaiters) resolve(ok)
  authWaiters = []
}

function send(msg: WsClientMessage) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg))
  }
}

function flushSubscriptions() {
  for (const id of subscribed) {
    send({ type: 'subscribe', conversationId: id })
  }
  for (const id of pendingSubscribe) {
    subscribed.add(id)
    send({ type: 'subscribe', conversationId: id })
  }
  pendingSubscribe.clear()
}

function whenAuthenticated(timeoutMs = 8000): Promise<boolean> {
  if (isAuthenticated && socket?.readyState === WebSocket.OPEN) {
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      authWaiters = authWaiters.filter((r) => r !== done)
      resolve(false)
    }, timeoutMs)
    const done = (ok: boolean) => {
      clearTimeout(timer)
      resolve(ok)
    }
    authWaiters.push(done)
  })
}

function connect(authToken: string, h: WsHandlers) {
  handlers = h

  if (
    socket?.readyState === WebSocket.OPEN
    && token === authToken
    && isAuthenticated
  ) {
    return
  }

  token = authToken
  isAuthenticated = false
  wsAuthenticated.value = false
  resolveAuthWaiters(false)

  if (socket) {
    socket.close()
  }

  socket = new WebSocket(WS_URL)

  socket.onopen = () => {
    isConnected.value = true
    send({ type: 'auth', token: authToken })
  }

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data) as WsServerMessage
    switch (data.type) {
      case 'authenticated':
        isAuthenticated = true
        wsAuthenticated.value = true
        flushSubscriptions()
        handlers?.onAuthenticated?.()
        resolveAuthWaiters(true)
        break
      case 'message':
        handlers?.onMessage(data.message)
        break
      case 'message_updated':
        handlers?.onMessageUpdated(data.message)
        break
      case 'message_deleted':
        handlers?.onMessageDeleted(data.messageId, data.conversationId)
        break
      case 'typing':
        handlers?.onTyping(data.state)
        break
      case 'read_receipt':
        handlers?.onReadReceipt(data.receipt)
        break
      case 'pong':
        handlers?.onPong?.()
        break
    }
  }

  socket.onclose = () => {
    isConnected.value = false
    isAuthenticated = false
    wsAuthenticated.value = false
    resolveAuthWaiters(false)
    reconnectTimer = setTimeout(() => {
      if (token && handlers) connect(token, handlers)
    }, 3000)
  }

  socket.onerror = () => {
    isConnected.value = false
  }
}

function subscribe(conversationId: string) {
  subscribed.add(conversationId)
  if (isAuthenticated && socket?.readyState === WebSocket.OPEN) {
    send({ type: 'subscribe', conversationId })
  } else {
    pendingSubscribe.add(conversationId)
  }
}

function unsubscribe(conversationId: string) {
  subscribed.delete(conversationId)
  pendingSubscribe.delete(conversationId)
  send({ type: 'unsubscribe', conversationId })
}

function setTyping(conversationId: string, isTyping: boolean) {
  send({ type: 'typing', conversationId, isTyping })
}

function markRead(conversationId: string, messageId: string) {
  send({ type: 'read', conversationId, messageId })
}

function ping() {
  send({ type: 'ping' })
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  socket?.close()
  socket = null
  isAuthenticated = false
  wsAuthenticated.value = false
  isConnected.value = false
  resolveAuthWaiters(false)
}

export function useWebSocket() {
  return {
    isConnected,
    wsAuthenticated,
    connect,
    subscribe,
    unsubscribe,
    setTyping,
    markRead,
    ping,
    disconnect,
    whenAuthenticated,
  }
}
