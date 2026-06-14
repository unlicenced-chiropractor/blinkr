import type { Env } from '../env'
import { broadcastToConversation } from './broadcast'

export async function getUnreadCountsForConversations(
  env: Env,
  conversationIds: string[],
  userId: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!conversationIds.length) return map

  for (const id of conversationIds) map.set(id, 0)

  const placeholders = conversationIds.map(() => '?').join(',')
  const { results } = await env.DB.prepare(`
    SELECT m.conversation_id, COUNT(*) AS count
    FROM messages m
    WHERE m.conversation_id IN (${placeholders})
      AND m.sender_id != ?
      AND m.deleted_at IS NULL
      AND m.created_at > COALESCE(
        (SELECT m2.created_at FROM read_receipts rr
         JOIN messages m2 ON m2.id = rr.message_id
         WHERE rr.conversation_id = m.conversation_id AND rr.user_id = ?),
        '1970-01-01'
      )
    GROUP BY m.conversation_id
  `)
    .bind(...conversationIds, userId, userId)
    .all<{ conversation_id: string; count: number }>()

  for (const row of results) {
    map.set(row.conversation_id, row.count)
  }
  return map
}

export async function getUnreadCount(
  env: Env,
  conversationId: string,
  userId: string,
): Promise<number> {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM messages m
    WHERE m.conversation_id = ?
      AND m.sender_id != ?
      AND m.deleted_at IS NULL
      AND m.created_at > COALESCE(
        (SELECT m2.created_at FROM read_receipts rr
         JOIN messages m2 ON m2.id = rr.message_id
         WHERE rr.conversation_id = ? AND rr.user_id = ?),
        '1970-01-01'
      )
  `)
    .bind(conversationId, userId, conversationId, userId)
    .first<{ count: number }>()

  return row?.count ?? 0
}

export async function markConversationRead(
  env: Env,
  conversationId: string,
  userId: string,
  messageId: string,
): Promise<void> {
  const now = new Date().toISOString()

  await env.DB.prepare(`
    INSERT INTO read_receipts (conversation_id, user_id, message_id, read_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(conversation_id, user_id) DO UPDATE SET
      message_id = excluded.message_id,
      read_at = excluded.read_at
  `)
    .bind(conversationId, userId, messageId, now)
    .run()

  await broadcastToConversation(env, {
    type: 'read_receipt',
    receipt: { userId, messageId, readAt: now, conversationId },
  })
}

export async function getConversationReadReceipts(
  env: Env,
  conversationId: string,
): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare(
    'SELECT user_id, message_id FROM read_receipts WHERE conversation_id = ?',
  )
    .bind(conversationId)
    .all<{ user_id: string; message_id: string }>()

  const map: Record<string, string> = {}
  for (const r of results) {
    map[r.user_id] = r.message_id
  }
  return map
}
