<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { User } from '@blinkr/shared'
import { api } from '@/lib/api'
import { useChatStore } from '@/stores/chat'
import Avatar from '@/components/ui/Avatar.vue'

const open = defineModel<boolean>('open', { default: false })
const chat = useChatStore()

const emit = defineEmits<{
  created: [conversationId: string]
}>()

const friends = ref<User[]>([])
const selectedIds = ref<Set<string>>(new Set())
const groupName = ref('')
const loadingFriends = ref(false)
const creating = ref(false)
const error = ref('')

const canCreate = computed(
  () => groupName.value.trim().length > 0 && selectedIds.value.size >= 1 && !creating.value,
)

watch(open, (isOpen) => {
  if (isOpen) {
    loadFriends()
  } else {
    resetForm()
  }
})

function resetForm() {
  groupName.value = ''
  selectedIds.value = new Set()
  error.value = ''
}

async function loadFriends() {
  loadingFriends.value = true
  error.value = ''
  try {
    friends.value = await api.get<User[]>('/friends')
  } catch {
    friends.value = []
    error.value = 'Could not load friends'
  } finally {
    loadingFriends.value = false
  }
}

function toggleFriend(friendId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(friendId)) next.delete(friendId)
  else next.add(friendId)
  selectedIds.value = next
}

async function submit() {
  if (!canCreate.value) return
  creating.value = true
  error.value = ''
  try {
    const conv = await chat.createGroup(groupName.value.trim(), [...selectedIds.value])
    open.value = false
    emit('created', conv.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not create group'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      @click.self="open = false"
    >
      <div
        class="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-panel-light shadow-xl ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
        role="dialog"
        aria-labelledby="create-group-title"
      >
        <header class="flex items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
          <h2 id="create-group-title" class="text-lg font-semibold">New group chat</h2>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-elevated-light dark:hover:bg-elevated-dark"
            @click="open = false"
          >
            ✕
          </button>
        </header>

        <div class="space-y-4 overflow-y-auto p-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium">Group name</label>
            <input
              v-model="groupName"
              type="text"
              maxlength="64"
              placeholder="e.g. Weekend crew"
              class="w-full rounded-xl bg-elevated-light px-4 py-2.5 outline-none ring-1 ring-border-light focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
            />
          </div>

          <div>
            <p class="mb-2 text-sm font-medium">
              Add friends
              <span class="font-normal text-text-secondary-light dark:text-text-secondary-dark">
                ({{ selectedIds.size }} selected)
              </span>
            </p>

            <p v-if="loadingFriends" class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Loading friends...
            </p>
            <p v-else-if="!friends.length" class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Add friends first, then create a group.
            </p>

            <div v-else class="max-h-56 space-y-1 overflow-y-auto">
              <button
                v-for="friend in friends"
                :key="friend.id"
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition"
                :class="selectedIds.has(friend.id)
                  ? 'bg-blink-600/10 ring-1 ring-blink-500/40 dark:bg-blink-500/15'
                  : 'hover:bg-elevated-light dark:hover:bg-elevated-dark'"
                @click="toggleFriend(friend.id)"
              >
                <Avatar :src="friend.avatarUrl" :name="friend.displayName" size="sm" />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">{{ friend.displayName }}</p>
                  <p class="truncate text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    @{{ friend.username }}
                  </p>
                </div>
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                  :class="selectedIds.has(friend.id)
                    ? 'border-blink-600 bg-blink-600 text-white'
                    : 'border-border-light dark:border-border-dark'"
                >
                  <svg v-if="selectedIds.has(friend.id)" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </button>
            </div>
          </div>

          <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        </div>

        <footer class="border-t border-border-light p-4 dark:border-border-dark">
          <button
            type="button"
            class="w-full rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            :disabled="!canCreate"
            @click="submit"
          >
            {{ creating ? 'Creating...' : 'Create group' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
