<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
</script>

<template>
  <button
    type="button"
    class="flex h-9 w-9 items-center justify-center rounded-xl bg-elevated-light text-text-secondary-light transition-all hover:bg-blink-100 hover:text-blink-600 dark:bg-elevated-dark dark:text-text-secondary-dark dark:hover:bg-blink-900/50 dark:hover:text-blink-300"
    :aria-label="theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="theme.toggle()"
  >
    <Transition name="icon" mode="out-in">
      <svg v-if="theme.isDark" key="moon" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
      <svg v-else key="sun" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    </Transition>
  </button>
</template>

<style scoped>
.icon-enter-active,
.icon-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.icon-enter-from {
  opacity: 0;
  transform: rotate(-30deg) scale(0.8);
}
.icon-leave-to {
  opacity: 0;
  transform: rotate(30deg) scale(0.8);
}
</style>
