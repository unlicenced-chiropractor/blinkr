<script setup lang="ts">
import { useBackgroundStore } from '@/stores/background'

const background = useBackgroundStore()
</script>

<template>
  <div
    v-if="background.imageUrl"
    class="pointer-events-none fixed inset-0 z-0"
    aria-hidden="true"
  >
    <img
      :src="background.imageUrl"
      alt=""
      class="h-full w-full object-cover"
    >
    <div class="absolute inset-0 bg-black/40 dark:bg-black/55" />
  </div>
</template>
