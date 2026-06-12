<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { ThemeMode } from '@/stores/theme'
import Avatar from '@/components/ui/Avatar.vue'

const auth = useAuthStore()
const theme = useThemeStore()

const uploading = ref(false)
const uploadError = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

async function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    await auth.uploadAvatar(file)
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    uploading.value = false
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
        <h1 class="text-lg font-semibold">Settings</h1>
      </div>
    </header>

    <div class="mx-auto max-w-2xl space-y-6 p-4">
      <section class="rounded-2xl bg-panel-light p-4 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark">
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="group relative"
            :disabled="uploading"
            @click="avatarInput?.click()"
          >
            <Avatar
              :src="auth.user?.avatarUrl"
              :name="auth.user?.displayName ?? 'User'"
              size="lg"
            />
            <span class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              {{ uploading ? '...' : 'Edit' }}
            </span>
          </button>
          <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
          <div>
            <p class="text-lg font-semibold">{{ auth.user?.displayName }}</p>
            <p class="text-text-secondary-light dark:text-text-secondary-dark">@{{ auth.user?.username }}</p>
            <button
              type="button"
              class="mt-2 text-sm font-medium text-blink-600 hover:underline dark:text-blink-400"
              :disabled="uploading"
              @click="avatarInput?.click()"
            >
              Change profile photo
            </button>
            <p v-if="uploadError" class="mt-1 text-sm text-red-500">{{ uploadError }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-panel-light p-4 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark">
        <h2 class="mb-3 font-medium">Appearance</h2>
        <div class="flex gap-2">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            type="button"
            class="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            :class="theme.mode === opt.value
              ? 'gradient-brand text-white'
              : 'bg-elevated-light dark:bg-elevated-dark'"
            @click="theme.setMode(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>

      <section class="rounded-2xl bg-panel-light p-4 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark">
        <h2 class="mb-3 font-medium">Notifications</h2>
        <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Push notifications are enabled via the PWA on web and native notifications on desktop.
        </p>
      </section>

      <button
        type="button"
        class="w-full rounded-2xl bg-red-500/10 py-3 font-medium text-red-500 transition hover:bg-red-500/20"
        @click="auth.logout(); $router.push('/login')"
      >
        Sign out
      </button>
    </div>
  </div>
</template>
