import { ChatRoom } from './durable-objects/chat-room'
import type { Env } from './env'
import { handleAuth } from './routes/auth'
import { handleConversations } from './routes/conversations'
import { handleFriends } from './routes/friends'
import { handleMedia } from './routes/media'
import { handleUsers } from './routes/users'
import { cors, error } from './utils'

export { ChatRoom }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return cors()

    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const globalRoom = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName('global'))
      return globalRoom.fetch(request)
    }

    const mediaRes = await handleMedia(request, env, path)
    if (mediaRes) return mediaRes

    const authRes = await handleAuth(request, env, path)
    if (authRes) return authRes

    const friendsRes = await handleFriends(request, env, path)
    if (friendsRes) return friendsRes

    const usersRes = await handleUsers(request, env, path)
    if (usersRes) return usersRes

    const convRes = await handleConversations(request, env, path)
    if (convRes) return convRes

    return env.ASSETS.fetch(request)
  },
}
