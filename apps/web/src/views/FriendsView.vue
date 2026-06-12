<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Avatar from '@/components/ui/Avatar.vue'
import { useUserSearch } from '@/composables/useUserSearch'
import { api } from '@/lib/api'
import { useChatStore } from '@/stores/chat'
import type { FriendRequest, User } from '@blinkr/shared'

const { query, results, loading, hint } = useUserSearch()
const chat = useChatStore()
const router = useRouter()

const pendingRequests = ref<FriendRequest[]>([])
const friends = ref<User[]>([])
const requestedIds = ref<Set<string>>(new Set())
const messagingId = ref<string | null>(null)

onMounted(loadFriends)

async function loadFriends() {
  try {
    friends.value = await api.get<User[]>('/friends')
    pendingRequests.value = await api.get<FriendRequest[]>('/friends/requests')
  } catch {
    friends.value = []
    pendingRequests.value = []
  }
}

async function sendRequest(userId: string) {
  await api.post('/friends/request', { userId })
  requestedIds.value.add(userId)
}

async function respond(requestId: string, accept: boolean) {
  const req = pendingRequests.value.find((r) => r.id === requestId)
  const res = await api.post<{ ok: boolean; conversationId?: string }>(
    `/friends/requests/${requestId}/${accept ? 'accept' : 'decline'}`,
  )
  pendingRequests.value = pendingRequests.value.filter((r) => r.id !== requestId)
  if (accept && req) {
    await loadFriends()
    if (res.conversationId) {
      await chat.loadConversations()
      router.push({ path: '/chat', query: { conversation: res.conversationId } })
    } else {
      await messageFriend(req.fromUserId)
    }
  }
}

async function messageFriend(friendId: string) {
  messagingId.value = friendId
  try {
    const conv = await chat.openDirectChat(friendId)
    router.push({ path: '/chat', query: { conversation: conv.id } })
  } finally {
    messagingId.value = null
  }
}
</script>

<template>
  <div class="min-h-dvh bg-surface-light dark:bg-surface-dark">
    <header class="border-b border-border-light bg-panel-light px-4 py-4 dark:border-border-dark dark:bg-panel-dark">
      <div class="mx-auto flex max-w-2xl items-center gap-3">
        <RouterLink
          to="/chat"
          class="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-elevated-light dark:hover:bg-elevated-dark"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <h1 class="text-lg font-semibold">Friends</h1>
      </div>
    </header>

    <div class="mx-auto max-w-2xl space-y-8 p-4">
      <section>
        <h2 class="mb-3 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Add friends</h2>
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="query"
            type="search"
            autocomplete="off"
            placeholder="Search @username..."
            class="w-full rounded-xl bg-elevated-light py-2.5 pl-10 pr-4 outline-none ring-1 ring-border-light transition focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
          />
          <span
            v-if="loading"
            class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blink-500 border-t-transparent"
          />
        </div>
        <p v-if="hint" class="mt-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {{ hint }}
        </p>

        <div v-if="results.length" class="mt-3 space-y-2">
          <div
            v-for="user in results"
            :key="user.id"
            class="flex items-center justify-between rounded-2xl bg-panel-light p-3 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
          >
            <div class="flex items-center gap-3">
              <Avatar :src="user.avatarUrl" :name="user.displayName" size="sm" />
              <div>
                <p class="font-medium">
                  {{ user.displayName }}
                  <span
                    v-if="user.exactMatch"
                    class="ml-1.5 rounded-md bg-blink-600/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blink-600 dark:text-blink-400"
                  >
                    exact
                  </span>
                </p>
                <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">@{{ user.username }}</p>
              </div>
            </div>
            <button
              v-if="requestedIds.has(user.id)"
              type="button"
              class="rounded-xl bg-elevated-light px-3 py-1.5 text-sm font-medium text-text-secondary-light dark:bg-elevated-dark dark:text-text-secondary-dark"
              disabled
            >
              Sent
            </button>
            <button
              v-else
              type="button"
              class="rounded-xl bg-blink-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blink-700"
              @click="sendRequest(user.id)"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      <section v-if="pendingRequests.length">
        <h2 class="mb-3 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Friend requests</h2>
        <div class="space-y-2">
          <div
            v-for="req in pendingRequests"
            :key="req.id"
            class="flex items-center justify-between rounded-2xl bg-panel-light p-3 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
          >
            <div v-if="req.fromUser" class="flex items-center gap-3">
              <Avatar :src="req.fromUser.avatarUrl" :name="req.fromUser.displayName" size="sm" />
              <div>
                <p class="font-medium">{{ req.fromUser.displayName }}</p>
                <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">@{{ req.fromUser.username }}</p>
              </div>
            </div>
            <p v-else class="text-sm">Request from {{ req.fromUserId }}</p>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-xl bg-blink-600 px-3 py-1.5 text-sm text-white"
                @click="respond(req.id, true)"
              >
                Accept
              </button>
              <button
                type="button"
                class="rounded-xl bg-elevated-light px-3 py-1.5 text-sm dark:bg-elevated-dark"
                @click="respond(req.id, false)"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="mb-3 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Your friends</h2>
        <p v-if="!friends.length" class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          No friends yet. Search above to add someone!
        </p>
        <div v-else class="space-y-2">
          <div
            v-for="friend in friends"
            :key="friend.id"
            class="flex items-center justify-between rounded-2xl bg-panel-light p-3 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
          >
            <div class="flex items-center gap-3">
              <Avatar :src="friend.avatarUrl" :name="friend.displayName" size="sm" online />
              <div>
                <p class="font-medium">{{ friend.displayName }}</p>
                <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">@{{ friend.username }}</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-xl bg-blink-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blink-700 disabled:opacity-50"
              :disabled="messagingId === friend.id"
              @click="messageFriend(friend.id)"
            >
              {{ messagingId === friend.id ? 'Opening...' : 'Message' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
