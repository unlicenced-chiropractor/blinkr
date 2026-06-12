interface Session {
  userId: string
  subscriptions: Map<string, Set<WebSocket>>
}

export class ChatRoom implements DurableObject {
  private sessions = new Map<string, Session>()

  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const event = await request.json()
      this.broadcast(event)
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
    let userId: string | null = null
    const subscribedConversations = new Set<string>()

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string)

        switch (data.type) {
          case 'auth':
            userId = data.userId
            if (userId) {
              let session = this.sessions.get(userId)
              if (!session) {
                session = { userId, subscriptions: new Map() }
                this.sessions.set(userId, session)
              }
            }
            ws.send(JSON.stringify({ type: 'authenticated', userId }))
            break

          case 'subscribe':
            if (!userId) break
            subscribedConversations.add(data.conversationId)
            break

          case 'unsubscribe':
            subscribedConversations.delete(data.conversationId)
            break

          case 'typing':
            if (!userId) break
            this.broadcastToConversation(data.conversationId, {
              type: 'typing',
              state: {
                conversationId: data.conversationId,
                userId,
                isTyping: data.isTyping,
              },
            }, userId)
            break

          case 'read':
            if (!userId) break
            this.broadcastToConversation(data.conversationId, {
              type: 'read_receipt',
              receipt: {
                userId,
                messageId: data.messageId,
                readAt: new Date().toISOString(),
              },
            })
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
      if (userId) {
        this.broadcast({ type: 'presence', userId, online: false })
      }
    })
  }

  private broadcast(event: unknown) {
    const message = JSON.stringify(event)
    for (const [, session] of this.sessions) {
      for (const [, sockets] of session.subscriptions) {
        for (const ws of sockets) {
          try {
            ws.send(message)
          } catch {
            // socket closed
          }
        }
      }
    }
  }

  private broadcastToConversation(conversationId: string, event: unknown, excludeUserId?: string) {
    const message = JSON.stringify(event)
    for (const [uid, session] of this.sessions) {
      if (excludeUserId && uid === excludeUserId) continue
      const sockets = session.subscriptions.get(conversationId)
      if (!sockets) continue
      for (const ws of sockets) {
        try {
          ws.send(message)
        } catch {
          // socket closed
        }
      }
    }
  }
}
