<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useBackgroundStore } from '@/stores/background'
import type { ThemeMode } from '@/stores/theme'
import { WALLPAPER_COUNT } from '@/lib/wallpapers'
import Avatar from '@/components/ui/Avatar.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const background = useBackgroundStore()
const router = useRouter()

const BIO_MAX = 160
const DISPLAY_NAME_MAX = 50

const uploading = ref(false)
const uploadError = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)

const displayName = ref('')
const bio = ref('')
const profileSaving = ref(false)
const profileError = ref('')
const profileSaved = ref(false)

const isDemo = computed(() => auth.token === 'demo-token')

const profileDirty = computed(() => {
  if (!auth.user) return false
  return displayName.value.trim() !== auth.user.displayName
    || (bio.value.trim() || null) !== (auth.user.bio?.trim() || null)
})

const memberSince = computed(() => {
  if (!auth.user?.createdAt) return ''
  return new Date(auth.user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const themeOptions: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Bright backgrounds' },
  { value: 'dark', label: 'Dark', hint: 'True black' },
  { value: 'system', label: 'System', hint: 'Match device' },
]

const notifySupported = computed(() => typeof Notification !== 'undefined')
const notifyPermission = ref(
  typeof Notification !== 'undefined' ? Notification.permission : 'denied',
)

const notifyStatusLabel = computed(() => {
  switch (notifyPermission.value) {
    case 'granted': return 'Enabled'
    case 'denied': return 'Blocked'
    default: return 'Not enabled'
  }
})

const notifyStatusClass = computed(() => {
  switch (notifyPermission.value) {
    case 'granted': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    case 'denied': return 'bg-red-500/15 text-red-500'
    default: return 'bg-elevated-light text-text-secondary-light dark:bg-elevated-dark dark:text-text-secondary-dark'
  }
})

watch(
  () => auth.user,
  (user) => {
    if (!user) return
    displayName.value = user.displayName
    bio.value = user.bio ?? ''
  },
  { immediate: true },
)

async function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || isDemo.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    await auth.uploadAvatar(file)
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    uploading.value = false
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

async function saveProfile() {
  if (!profileDirty.value || isDemo.value) return
  profileSaving.value = true
  profileError.value = ''
  profileSaved.value = false
  try {
    await auth.updateProfile({
      displayName: displayName.value.trim(),
      bio: bio.value.trim() || null,
    })
    profileSaved.value = true
    setTimeout(() => { profileSaved.value = false }, 2500)
  } catch (err) {
    profileError.value = err instanceof Error ? err.message : 'Could not save profile'
  } finally {
    profileSaving.value = false
  }
}

async function requestNotifications() {
  if (!notifySupported.value) return
  try {
    notifyPermission.value = await Notification.requestPermission()
  } catch {
    notifyPermission.value = Notification.permission
  }
}

function signOut() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell min-h-dvh">
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
        <div>
          <h1 class="text-lg font-semibold">Settings</h1>
          <p class="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            Profile, appearance, and account
          </p>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-2xl space-y-4 p-4 pb-8">
      <p
        v-if="isDemo"
        class="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300"
      >
        Demo mode — profile changes are disabled. Register for a real account to save settings.
      </p>

      <!-- Profile -->
      <section class="rounded-2xl bg-panel-light p-4 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark">
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
          Profile
        </h2>

        <div class="mb-6 flex items-center gap-4">
          <button
            type="button"
            class="group relative shrink-0"
            :disabled="uploading || isDemo"
            @click="avatarInput?.click()"
          >
            <Avatar
              :src="auth.user?.avatarUrl"
              :name="auth.user?.displayName ?? 'User'"
              size="lg"
            />
            <span
              v-if="!isDemo"
              class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100"
            >
              {{ uploading ? '...' : 'Edit' }}
            </span>
          </button>
          <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
          <div class="min-w-0">
            <p class="truncate text-lg font-semibold">{{ auth.user?.displayName }}</p>
            <p class="text-text-secondary-light dark:text-text-secondary-dark">@{{ auth.user?.username }}</p>
            <button
              v-if="!isDemo"
              type="button"
              class="mt-2 text-sm font-medium text-blink-600 hover:underline dark:text-blink-400"
              :disabled="uploading"
              @click="avatarInput?.click()"
            >
              {{ uploading ? 'Uploading…' : 'Change profile photo' }}
            </button>
            <p v-if="uploadError" class="mt-1 text-sm text-red-500">{{ uploadError }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium">Display name</span>
            <input
              v-model="displayName"
              type="text"
              maxlength="50"
              :disabled="isDemo"
              class="w-full rounded-xl bg-elevated-light px-4 py-2.5 outline-none ring-1 ring-border-light transition focus:ring-2 focus:ring-blink-500 disabled:opacity-50 dark:bg-elevated-dark dark:ring-border-dark"
            />
            <span class="mt-1 block text-xs text-text-secondary-light dark:text-text-secondary-dark">
              {{ displayName.length }}/{{ DISPLAY_NAME_MAX }}
            </span>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium">Bio</span>
            <textarea
              v-model="bio"
              rows="3"
              :maxlength="BIO_MAX"
              :disabled="isDemo"
              placeholder="A short line about you…"
              class="w-full resize-none rounded-xl bg-elevated-light px-4 py-2.5 text-[15px] outline-none ring-1 ring-border-light transition placeholder:text-text-secondary-light focus:ring-2 focus:ring-blink-500 disabled:opacity-50 dark:bg-elevated-dark dark:ring-border-dark dark:placeholder:text-text-secondary-dark"
            />
            <span class="mt-1 block text-xs text-text-secondary-light dark:text-text-secondary-dark">
              {{ bio.length }}/{{ BIO_MAX }}
            </span>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium">Username</span>
            <input
              :value="auth.user?.username"
              type="text"
              disabled
              class="w-full rounded-xl bg-elevated-light/60 px-4 py-2.5 text-text-secondary-light outline-none ring-1 ring-border-light dark:bg-elevated-dark/60 dark:text-text-secondary-dark dark:ring-border-dark"
            />
            <span class="mt-1 block text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Usernames cannot be changed
            </span>
          </label>
        </div>

        <div v-if="!isDemo" class="mt-4 flex items-center gap-3">
          <button
            type="button"
            class="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blink-600/25 transition hover:opacity-90 disabled:opacity-40"
            :disabled="!profileDirty || profileSaving"
            @click="saveProfile"
          >
            {{ profileSaving ? 'Saving…' : 'Save profile' }}
          </button>
          <span v-if="profileSaved" class="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>
          <span v-if="profileError" class="text-sm text-red-500">{{ profileError }}</span>
        </div>
      </section>

      <!-- Appearance -->
      <section class="rounded-2xl bg-panel-light p-4 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark">
        <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
          Appearance
        </h2>
        <p class="mb-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Set a background image and choose light or dark mode
        </p>

        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
          Background
        </p>
        <RouterLink
          to="/settings/wallpapers"
          class="mb-5 flex items-center gap-3 rounded-xl bg-elevated-light px-3 py-3 ring-1 ring-transparent transition hover:ring-border-light dark:bg-elevated-dark dark:hover:ring-border-dark"
        >
          <span
            v-if="background.imageUrl"
            class="h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10"
          >
            <img :src="background.imageUrl" alt="" class="h-full w-full object-cover">
          </span>
          <span
            v-else
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-panel-light ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark"
          >
            <svg class="h-6 w-6 text-text-secondary-light dark:text-text-secondary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">{{ background.label }}</span>
            <span class="block text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Browse {{ WALLPAPER_COUNT }} wallpapers or upload your own
            </span>
          </span>
          <svg class="h-5 w-5 shrink-0 text-text-secondary-light dark:text-text-secondary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </RouterLink>

        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
          Mode
        </p>
        <div class="grid gap-2 sm:grid-cols-3">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            type="button"
            class="rounded-xl px-3 py-3 text-left transition"
            :class="theme.mode === opt.value
              ? 'gradient-brand text-white shadow-md shadow-blink-600/20'
              : 'bg-elevated-light dark:bg-elevated-dark'"
            @click="theme.setMode(opt.value)"
          >
            <span class="block text-sm font-semibold">{{ opt.label }}</span>
            <span
              class="block text-xs"
              :class="theme.mode === opt.value ? 'text-white/80' : 'text-text-secondary-light dark:text-text-secondary-dark'"
            >
              {{ opt.hint }}
            </span>
          </button>
        </div>
      </section>

      <!-- Notifications -->
      <section class="rounded-2xl bg-panel-light p-4 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
            Notifications
          </h2>
          <span
            v-if="notifySupported"
            class="rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="notifyStatusClass"
          >
            {{ notifyStatusLabel }}
          </span>
        </div>
        <p class="mb-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Get alerted when you receive new messages. On desktop, native notifications are used when the app is installed.
        </p>
        <button
          v-if="notifySupported && notifyPermission !== 'granted'"
          type="button"
          class="rounded-xl bg-elevated-light px-4 py-2.5 text-sm font-medium transition hover:ring-2 hover:ring-blink-500 dark:bg-elevated-dark"
          :disabled="notifyPermission === 'denied'"
          @click="requestNotifications"
        >
          {{ notifyPermission === 'denied' ? 'Blocked in browser settings' : 'Enable notifications' }}
        </button>
        <p v-else-if="!notifySupported" class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Notifications are not supported in this browser.
        </p>
        <p v-else class="text-sm text-emerald-600 dark:text-emerald-400">
          You will receive notifications for new messages when the app is in the background.
        </p>
      </section>

      <!-- Account -->
      <section class="rounded-2xl bg-panel-light p-4 ring-1 ring-border-light dark:bg-panel-dark dark:ring-border-dark">
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
          Account
        </h2>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-text-secondary-light dark:text-text-secondary-dark">Member since</dt>
            <dd class="font-medium">{{ memberSince || '—' }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-text-secondary-light dark:text-text-secondary-dark">Version</dt>
            <dd class="font-mono text-xs text-text-secondary-light dark:text-text-secondary-dark">0.1.0</dd>
          </div>
        </dl>
      </section>

      <button
        type="button"
        class="w-full rounded-2xl bg-red-500/10 py-3 font-medium text-red-500 transition hover:bg-red-500/20"
        @click="signOut"
      >
        Sign out
      </button>
    </div>
  </div>
</template>
