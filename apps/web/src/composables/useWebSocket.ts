import { ref } from 'vue'
import type { Message, TypingState, WsClientMessage, WsServerMessage } from '@blinkr/shared'

const WS_URL = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`

interface WsHandlers {
  onMessage: (msg: Message) => void
  onMessageUpdated: (msg: Message) => void
  onMessageDeleted: (messageId: string, conversationId: string) => void
  onTyping: (state: TypingState) => void
  onReadReceipt: (receipt: { userId: string; messageId: string; readAt: string }) => void
}

export function useWebSocket() {
  const socket = ref<WebSocket | null>(null)
  const subscribed = ref<Set<string>>(new Set())
  let handlers: WsHandlers | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let token: string | null = null

  function send(msg: WsClientMessage) {
    if (socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(msg))
    }
  }

  function connect(authToken: string, h: WsHandlers) {
    token = authToken
    handlers = h

    if (socket.value) {
      socket.value.close()
    }

    socket.value = new WebSocket(WS_URL)

    socket.value.onopen = () => {
      send({ type: 'auth', token: authToken })
      for (const id of subscribed.value) {
        send({ type: 'subscribe', conversationId: id })
      }
    }

    socket.value.onmessage = (event) => {
      const data = JSON.parse(event.data) as WsServerMessage
      switch (data.type) {
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
      }
    }

    socket.value.onclose = () => {
      reconnectTimer = setTimeout(() => {
        if (token && handlers) connect(token, handlers)
      }, 3000)
    }
  }

  function subscribe(conversationId: string) {
    subscribed.value.add(conversationId)
    send({ type: 'subscribe', conversationId })
  }

  function unsubscribe(conversationId: string) {
    subscribed.value.delete(conversationId)
    send({ type: 'unsubscribe', conversationId })
  }

  function setTyping(conversationId: string, isTyping: boolean) {
    send({ type: 'typing', conversationId, isTyping })
  }

  function markRead(conversationId: string, messageId: string) {
    send({ type: 'read', conversationId, messageId })
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    socket.value?.close()
    socket.value = null
  }

  return { connect, subscribe, unsubscribe, setTyping, markRead, disconnect }
}
