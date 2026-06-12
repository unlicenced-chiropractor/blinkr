import type { Env } from '../env'
import { getOrCreateDirectConversation } from '../services/conversations'
import { error, getUserId, id, json } from '../utils'

export async function handleFriends(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!path.startsWith('/friends')) return null

  const userId = await getUserId(request, env)
  if (!userId) return error('Unauthorized', 401)

  if (path === '/friends' && request.method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.created_at
      FROM friendships f
      JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = ?
    `).bind(userId).all()

    return json(
      results.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        createdAt: u.created_at,
      })),
    )
  }

  if (path === '/friends/requests' && request.method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT
        fr.id,
        fr.from_user_id,
        fr.to_user_id,
        fr.status,
        fr.created_at,
        u.username AS from_username,
        u.display_name AS from_display_name,
        u.avatar_url AS from_avatar_url
      FROM friend_requests fr
      JOIN users u ON u.id = fr.from_user_id
      WHERE fr.to_user_id = ? AND fr.status = 'pending'
    `).bind(userId).all()

    return json(
      results.map((r) => ({
        id: r.id,
        fromUserId: r.from_user_id,
        toUserId: r.to_user_id,
        status: r.status,
        createdAt: r.created_at,
        fromUser: {
          id: r.from_user_id,
          username: r.from_username,
          displayName: r.from_display_name,
          avatarUrl: r.from_avatar_url,
        },
      })),
    )
  }

  if (path === '/friends/request' && request.method === 'POST') {
    const body = await request.json<{ userId: string }>()
    if (body.userId === userId) return error('Cannot friend yourself')

    const requestId = id()
    await env.DB.prepare(
      'INSERT INTO friend_requests (id, from_user_id, to_user_id) VALUES (?, ?, ?)',
    )
      .bind(requestId, userId, body.userId)
      .run()

    return json({ id: requestId }, 201)
  }

  const respondMatch = path.match(/^\/friends\/requests\/([^/]+)\/(accept|decline)$/)
  if (respondMatch && request.method === 'POST') {
    const [, requestId, action] = respondMatch
    const req = await env.DB.prepare(
      'SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = ?',
    )
      .bind(requestId, userId, 'pending')
      .first<{ from_user_id: string; to_user_id: string }>()

    if (!req) return error('Request not found', 404)

    await env.DB.prepare('UPDATE friend_requests SET status = ? WHERE id = ?')
      .bind(action === 'accept' ? 'accepted' : 'declined', requestId)
      .run()

    if (action === 'accept') {
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)')
          .bind(req.from_user_id, req.to_user_id),
        env.DB.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)')
          .bind(req.to_user_id, req.from_user_id),
      ])
      const conversationId = await getOrCreateDirectConversation(
        env,
        req.from_user_id,
        req.to_user_id,
      )
      return json({ ok: true, conversationId })
    }

    return json({ ok: true })
  }

  return null
}
