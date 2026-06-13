import type { Env } from '../env'
import { error, getUserId, json } from '../utils'

const MIN_QUERY_LEN = 2
const MAX_RESULTS = 15

function normalizeQuery(raw: string | null): string | null {
  if (!raw) return null
  const q = raw.trim().replace(/^@+/, '').toLowerCase()
  if (q.length < MIN_QUERY_LEN) return null
  if (q.length > 32) return q.slice(0, 32)
  if (!/^[a-z0-9_]+$/.test(q)) return null
  return q
}

export async function handleUsers(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path !== '/users/search' || request.method !== 'GET') return null

  const userId = await getUserId(request, env)
  if (!userId) return error('Unauthorized', 401)

  const q = normalizeQuery(new URL(request.url).searchParams.get('q'))
  if (!q) {
    return json({ results: [], query: '' })
  }

  const { results } = await env.DB.prepare(`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.created_at,
      CASE
        WHEN u.username = ?1 THEN 0
        ELSE 1
      END AS match_rank,
      EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.user_id = ?2 AND f.friend_id = u.id
      ) AS is_friend,
      EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.from_user_id = ?2 AND fr.to_user_id = u.id AND fr.status = 'pending'
      ) AS outgoing_request,
      (
        SELECT fr.id FROM friend_requests fr
        WHERE fr.from_user_id = u.id AND fr.to_user_id = ?2 AND fr.status = 'pending'
        LIMIT 1
      ) AS incoming_request_id
    FROM users u
    WHERE u.id != ?2
      AND (u.username = ?1 OR u.username LIKE ?1 || '%')
    ORDER BY match_rank, u.username
    LIMIT ?3
  `)
    .bind(q, userId, MAX_RESULTS)
    .all<{
      id: string
      username: string
      display_name: string
      avatar_url: string | null
      created_at: string
      match_rank: number
      is_friend: number
      outgoing_request: number
      incoming_request_id: string | null
    }>()

  return json({
    query: q,
    results: results.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      createdAt: u.created_at,
      exactMatch: u.match_rank === 0,
      isFriend: u.is_friend === 1,
      outgoingRequest: u.outgoing_request === 1,
      incomingRequestId: u.incoming_request_id,
    })),
  })
}
