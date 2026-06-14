<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useBackgroundStore } from '@/stores/background'
import { useAuthStore } from '@/stores/auth'
import AppBackground from '@/components/ui/AppBackground.vue'

const theme = useThemeStore()
const background = useBackgroundStore()
const auth = useAuthStore()
theme.init()
void background.init()

onMounted(async () => {
  if (!auth.sessionReady) {
    await auth.initSession()
  }
})
</script>

<template>
  <AppBackground />
  <div v-if="!auth.sessionReady" class="app-shell relative z-10 flex min-h-dvh items-center justify-center">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-blink-500 border-t-transparent" />
  </div>
  <div v-else class="relative z-10 min-h-dvh">
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
