import type { Env } from '../env'
import { verifyToken } from '../utils'

interface ClientSession {
  userId: string
  ws: WebSocket
  subscribedConversations: Set<string>
  pendingSubscriptions: Set<string>
}

export class ChatRoom implements DurableObject {
  private clients = new Set<ClientSession>()

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const event = await request.json() as { type: string; message?: { conversationId: string } }
      this.broadcastEvent(event)
      return new Response('ok')
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.handleSession(server)

    return new Response(null, { status: 101, webSocket: client })
  }

  private handleSession(ws: WebSocket) {
    ws.accept()
    const session: ClientSession = {
      userId: '',
      ws,
      subscribedConversations: new Set(),
      pendingSubscriptions: new Set(),
    }
    this.clients.add(session)

    ws.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string)

        switch (data.type) {
          case 'auth': {
            const userId = await verifyToken(data.token, this.env.JWT_SECRET)
            if (!userId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }))
              return
            }
            session.userId = userId
            for (const id of session.pendingSubscriptions) {
              session.subscribedConversations.add(id)
            }
            session.pendingSubscriptions.clear()
            ws.send(JSON.stringify({ type: 'authenticated', userId }))
            break
          }

          case 'subscribe':
            if (!session.userId) {
              session.pendingSubscriptions.add(data.conversationId)
              break
            }
            session.subscribedConversations.add(data.conversationId)
            break

          case 'unsubscribe':
            session.subscribedConversations.delete(data.conversationId)
            break

          case 'typing':
            if (!session.userId) break
            this.broadcastToConversation(
              data.conversationId,
              {
                type: 'typing',
                state: {
                  conversationId: data.conversationId,
                  userId: session.userId,
                  isTyping: data.isTyping,
                },
              },
              session,
            )
            break

          case 'read':
            if (!session.userId) break
            this.broadcastToConversation(
              data.conversationId,
              {
                type: 'read_receipt',
                receipt: {
                  userId: session.userId,
                  messageId: data.messageId,
                  conversationId: data.conversationId,
                  readAt: new Date().toISOString(),
                },
              },
              session,
            )
            break

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }))
            break
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }))
      }
    })

    ws.addEventListener('close', () => {
      if (session.userId) {
        for (const conversationId of session.subscribedConversations) {
          this.broadcastToConversation(conversationId, {
            type: 'typing',
            state: {
              conversationId,
              userId: session.userId,
              isTyping: false,
            },
          })
        }
      }
      this.clients.delete(session)
    })
  }

  private broadcastEvent(event: {
    type: string
    message?: { conversationId: string }
    conversationId?: string
  }) {
    const conversationId = event.message?.conversationId ?? event.conversationId
    if (conversationId) {
      this.broadcastToConversation(conversationId, event)
      return
    }
    this.sendToAll(event)
  }

  private broadcastToConversation(
    conversationId: string,
    event: unknown,
    exclude?: ClientSession,
  ) {
    const payload = JSON.stringify(event)
    for (const client of this.clients) {
      if (exclude && client === exclude) continue
      if (!client.userId) continue
      if (!client.subscribedConversations.has(conversationId)) continue
      try {
        client.ws.send(payload)
      } catch {
        this.clients.delete(client)
      }
    }
  }

  private sendToAll(event: unknown) {
    const payload = JSON.stringify(event)
    for (const client of this.clients) {
      try {
        client.ws.send(payload)
      } catch {
        this.clients.delete(client)
      }
    }
  }
}
