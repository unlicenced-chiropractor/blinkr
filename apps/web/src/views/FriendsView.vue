<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/ui/Avatar.vue'
import { api } from '@/lib/api'
import type { FriendRequest, User } from '@blinkr/shared'

const searchQuery = ref('')
const searchResults = ref<User[]>([])
const pendingRequests = ref<FriendRequest[]>([])
const friends = ref<User[]>([])
const loading = ref(false)

onMounted(async () => {
  try {
    friends.value = await api.get<User[]>('/friends')
    pendingRequests.value = await api.get<FriendRequest[]>('/friends/requests')
  } catch {
    friends.value = []
    pendingRequests.value = []
  }
})

async function search() {
  if (!searchQuery.value.trim()) return
  loading.value = true
  try {
    searchResults.value = await api.get<User[]>(`/users/search?q=${encodeURIComponent(searchQuery.value)}`)
  } catch {
    searchResults.value = []
  } finally {
    loading.value = false
  }
}

async function sendRequest(userId: string) {
  await api.post('/friends/request', { userId })
}

async function respond(requestId: string, accept: boolean) {
  await api.post(`/friends/requests/${requestId}/${accept ? 'accept' : 'decline'}`)
  pendingRequests.value = pendingRequests.value.filter((r) => r.id !== requestId)
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
        <form class="flex gap-2" @submit.prevent="search">
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search by username..."
            class="flex-1 rounded-xl bg-elevated-light px-4 py-2.5 outline-none ring-1 ring-border-light focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
          />
          <button
            type="submit"
            class="rounded-xl px-4 py-2.5 font-medium text-white gradient-brand"
            :disabled="loading"
          >
            Search
          </button>
        </form>
        <div v-if="searchResults.length" class="mt-3 space-y-2">
          <div
            v-for="user in searchResults"
            :key="user.id"
            class="flex items-center justify-between rounded-2xl bg-panel-light p-3 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
          >
            <div class="flex items-center gap-3">
              <Avatar :src="user.avatarUrl" :name="user.displayName" size="sm" />
              <div>
                <p class="font-medium">{{ user.displayName }}</p>
                <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">@{{ user.username }}</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-xl bg-blink-600 px-3 py-1.5 text-sm font-medium text-white"
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
            <p class="text-sm">Request from {{ req.fromUserId }}</p>
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
            class="flex items-center gap-3 rounded-2xl bg-panel-light p-3 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
          >
            <Avatar :src="friend.avatarUrl" :name="friend.displayName" size="sm" online />
            <div>
              <p class="font-medium">{{ friend.displayName }}</p>
              <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">@{{ friend.username }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
