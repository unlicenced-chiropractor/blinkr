import type { Env } from '../env'
import { id } from '../utils'

export type AuthEventType = 'register' | 'login' | 'login_failed'

export async function logAuthEvent(
  env: Env,
  request: Request,
  event: {
    type: AuthEventType
    userId?: string | null
    username?: string | null
  },
): Promise<void> {
  const ip = request.headers.get('CF-Connecting-IP')
    ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? null
  const userAgent = request.headers.get('User-Agent') ?? null

  await env.DB.prepare(`
    INSERT INTO auth_events (id, user_id, username, event_type, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(id(), event.userId ?? null, event.username ?? null, event.type, ip, userAgent)
    .run()
}
