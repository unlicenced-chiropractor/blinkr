import type { Env } from '../env'
import { getUnreadCountsForConversations } from './read-receipts'

interface ConversationRow {
  id: string
  type: string
  name: string | null
  icon_url: string | null
  last_message_at: string | null
  created_at: string
}

interface PeerRow {
  conversation_id: string
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

interface MemberRow {
  conversation_id: string
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

function inClause(count: number): string {
  return count ? Array(count).fill('?').join(', ') : "''"
}

export async function formatConversationsBatch(
  env: Env,
  rows: ConversationRow[],
  userId: string,
) {
  if (!rows.length) return []

  const ids = rows.map((c) => c.id)
  const memberIdsByConv = new Map<string, string[]>()
  const peersByConv = new Map<string, {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }>()
  const membersByConv = new Map<string, Array<{
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }>>()

  const { results: allMemberRows } = await env.DB.prepare(`
    SELECT conversation_id, user_id FROM conversation_members
    WHERE conversation_id IN (${inClause(ids.length)})
  `)
    .bind(...ids)
    .all<{ conversation_id: string; user_id: string }>()

  for (const row of allMemberRows) {
    const list = memberIdsByConv.get(row.conversation_id) ?? []
    list.push(row.user_id)
    memberIdsByConv.set(row.conversation_id, list)
  }

  const directIds = rows.filter((c) => c.type === 'direct').map((c) => c.id)
  if (directIds.length) {
    const { results: peerRows } = await env.DB.prepare(`
      SELECT cm.conversation_id, u.id, u.username, u.display_name, u.avatar_url
      FROM conversation_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.conversation_id IN (${inClause(directIds.length)}) AND cm.user_id != ?
    `)
      .bind(...directIds, userId)
      .all<PeerRow>()

    for (const peer of peerRows) {
      peersByConv.set(peer.conversation_id, {
        id: peer.id,
        username: peer.username,
        displayName: peer.display_name,
        avatarUrl: peer.avatar_url,
      })
    }
  }

  const groupIds = rows.filter((c) => c.type === 'group').map((c) => c.id)
  if (groupIds.length) {
    const { results: groupMemberRows } = await env.DB.prepare(`
      SELECT cm.conversation_id, u.id, u.username, u.display_name, u.avatar_url
      FROM conversation_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.conversation_id IN (${inClause(groupIds.length)})
      ORDER BY u.display_name
    `)
      .bind(...groupIds)
      .all<MemberRow>()

    for (const member of groupMemberRows) {
      const list = membersByConv.get(member.conversation_id) ?? []
      list.push({
        id: member.id,
        username: member.username,
        displayName: member.display_name,
        avatarUrl: member.avatar_url,
      })
      membersByConv.set(member.conversation_id, list)
    }
  }

  const unreadMap = await getUnreadCountsForConversations(env, ids, userId)

  return rows.map((c) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    iconUrl: c.icon_url,
    memberIds: memberIdsByConv.get(c.id) ?? [],
    members: c.type === 'group' ? membersByConv.get(c.id) : undefined,
    peer: c.type === 'direct' ? peersByConv.get(c.id) ?? null : null,
    unreadCount: unreadMap.get(c.id) ?? 0,
    lastMessageAt: c.last_message_at,
    createdAt: c.created_at,
  }))
}

export async function formatConversation(
  env: Env,
  c: Record<string, unknown>,
  userId: string,
) {
  const [formatted] = await formatConversationsBatch(
    env,
    [{
      id: c.id as string,
      type: c.type as string,
      name: c.name as string | null,
      icon_url: c.icon_url as string | null,
      last_message_at: c.last_message_at as string | null,
      created_at: c.created_at as string,
    }],
    userId,
  )
  return formatted
}
