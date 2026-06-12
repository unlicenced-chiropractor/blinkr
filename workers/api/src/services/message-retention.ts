import type { Env } from '../env'

/** Messages older than this are deleted. */
export const RETENTION_DAYS = 30

/** Max messages kept per conversation (rolling window). */
export const MAX_MESSAGES_PER_CONVERSATION = 200

/** Max messages returned in a single history fetch. */
export const HISTORY_FETCH_LIMIT = 100

export async function pruneConversationMessages(
  env: Env,
  conversationId: string,
): Promise<void> {
  await env.DB.prepare(`
    DELETE FROM message_reactions
    WHERE message_id IN (
      SELECT id FROM messages
      WHERE conversation_id = ?
        AND created_at < datetime('now', '-' || ? || ' days')
    )
  `)
    .bind(conversationId, RETENTION_DAYS)
    .run()

  await env.DB.prepare(`
    DELETE FROM messages
    WHERE conversation_id = ?
      AND created_at < datetime('now', '-' || ? || ' days')
  `)
    .bind(conversationId, RETENTION_DAYS)
    .run()

  await env.DB.prepare(`
    DELETE FROM message_reactions
    WHERE message_id IN (
      SELECT id FROM messages
      WHERE conversation_id = ?
        AND id NOT IN (
          SELECT id FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        )
    )
  `)
    .bind(conversationId, conversationId, MAX_MESSAGES_PER_CONVERSATION)
    .run()

  await env.DB.prepare(`
    DELETE FROM messages
    WHERE conversation_id = ?
      AND id NOT IN (
        SELECT id FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
  `)
    .bind(conversationId, conversationId, MAX_MESSAGES_PER_CONVERSATION)
    .run()
}
