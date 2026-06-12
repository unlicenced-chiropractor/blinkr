import type { Env } from '../env'

const GLOBAL_ROOM = 'global'

export async function broadcastToConversation(
  env: Env,
  event: unknown,
): Promise<void> {
  const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(GLOBAL_ROOM))
  await room.fetch(new Request('https://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify(event),
  }))
}
