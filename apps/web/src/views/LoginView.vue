<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BlinkrLogo from '@/components/ui/BlinkrLogo.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/chat'
    router.push(redirect)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl dark:bg-white/[0.03]" />
      <div class="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blink-600/10 blur-3xl dark:bg-blink-600/[0.06]" />
    </div>

    <div class="absolute right-4 top-4">
      <ThemeToggle />
    </div>

    <div class="glass relative w-full max-w-md rounded-3xl p-8 shadow-2xl ring-1 ring-border-light dark:ring-border-dark">
      <div class="mb-8 flex justify-center">
        <BlinkrLogo size="lg" />
      </div>

      <p class="mb-8 text-center text-text-secondary-light dark:text-text-secondary-dark">
        Messages that move at the speed of now.
      </p>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-sm font-medium">Username</label>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            class="w-full rounded-xl bg-elevated-light px-4 py-3 outline-none ring-1 ring-border-light transition focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
            placeholder="yourname"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium">Password</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full rounded-xl bg-elevated-light px-4 py-3 outline-none ring-1 ring-border-light transition focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

        <button
          type="submit"
          class="w-full rounded-xl py-3 font-semibold text-white gradient-brand shadow-lg shadow-blink-600/30 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <button
        type="button"
        class="mt-4 w-full rounded-xl border border-border-light py-3 text-sm font-medium transition hover:bg-elevated-light dark:border-border-dark dark:hover:bg-elevated-dark"
        @click="auth.enterDemoMode(); router.push('/chat')"
      >
        Try demo (no account needed)
      </button>

      <p class="mt-6 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
        New here?
        <RouterLink to="/register" class="font-semibold text-blink-600 hover:underline dark:text-blink-400">
          Create an account
        </RouterLink>
      </p>
    </div>
  </div>
</template>
