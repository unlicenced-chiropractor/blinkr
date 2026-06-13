import { ChatRoom } from './durable-objects/chat-room'
import type { Env } from './env'
import { handleAuth } from './routes/auth'
import { handleConversations } from './routes/conversations'
import { handleFriends } from './routes/friends'
import { handleMedia } from './routes/media'
import { handleUsers } from './routes/users'
import { cors, error, json } from './utils'

export { ChatRoom }

function isPageNavigation(request: Request): boolean {
  const accept = request.headers.get('Accept') ?? ''
  return request.method === 'GET' && accept.includes('text/html')
}

function withCacheHeaders(path: string, response: Response): Response {
  const headers = new Headers(response.headers)

  if (
    path === '/'
    || path.endsWith('.html')
    || path.endsWith('/sw.js')
    || path.endsWith('/registerSW.js')
  ) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  } else if (path.startsWith('/assets/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return cors()

    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/health' && request.method === 'GET') {
      const res = json({ ok: true })
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    if (path === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const globalRoom = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName('global'))
      return globalRoom.fetch(request)
    }

    const mediaRes = await handleMedia(request, env, path)
    if (mediaRes) return mediaRes

    if (!isPageNavigation(request)) {
      const authRes = await handleAuth(request, env, path)
      if (authRes) return authRes

      const friendsRes = await handleFriends(request, env, path)
      if (friendsRes) return friendsRes

      const usersRes = await handleUsers(request, env, path)
      if (usersRes) return usersRes

      const convRes = await handleConversations(request, env, path)
      if (convRes) return convRes
    }

    const assetResponse = await env.ASSETS.fetch(request)
    return withCacheHeaders(path, assetResponse)
  },
}
