<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BlinkrLogo from '@/components/ui/BlinkrLogo.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const displayName = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(username.value, displayName.value, password.value)
    router.push('/chat')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blink-600/20 blur-3xl" />
      <div class="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
    </div>

    <div class="absolute right-4 top-4">
      <ThemeToggle />
    </div>

    <div class="glass relative w-full max-w-md rounded-3xl p-8 shadow-2xl ring-1 ring-border-light dark:ring-border-dark">
      <div class="mb-8 flex justify-center">
        <BlinkrLogo size="lg" />
      </div>

      <p class="mb-8 text-center text-text-secondary-light dark:text-text-secondary-dark">
        Pick a username. Start blinking.
      </p>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-sm font-medium">Username</label>
          <input
            v-model="username"
            type="text"
            required
            pattern="[a-zA-Z0-9_]{3,20}"
            autocomplete="username"
            class="w-full rounded-xl bg-elevated-light px-4 py-3 outline-none ring-1 ring-border-light transition focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
            placeholder="cooluser42"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium">Display name</label>
          <input
            v-model="displayName"
            type="text"
            required
            class="w-full rounded-xl bg-elevated-light px-4 py-3 outline-none ring-1 ring-border-light transition focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
            placeholder="Alex"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium">Password</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full rounded-xl bg-elevated-light px-4 py-3 outline-none ring-1 ring-border-light transition focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

        <button
          type="submit"
          class="w-full rounded-xl py-3 font-semibold text-white gradient-brand shadow-lg shadow-blink-600/30 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Already have an account?
        <RouterLink to="/login" class="font-semibold text-blink-600 hover:underline dark:text-blink-400">
          Sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>
