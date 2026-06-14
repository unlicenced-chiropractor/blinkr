<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useBackgroundStore } from '@/stores/background'
import { loadCustomWallpaperBlob } from '@/lib/background-db'
import {
  WALLPAPER_CATEGORIES,
  WALLPAPER_COUNT,
  compressWallpaperFile,
  filterWallpapers,
  type WallpaperCategory,
} from '@/lib/wallpapers'

const background = useBackgroundStore()

const query = ref('')
const activeCategory = ref<WallpaperCategory>('all')
const uploadError = ref('')
const uploading = ref(false)
const customPreviewUrl = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const visibleWallpapers = computed(() =>
  filterWallpapers(query.value, activeCategory.value),
)

onMounted(async () => {
  const blob = await loadCustomWallpaperBlob()
  if (blob) customPreviewUrl.value = URL.createObjectURL(blob)
})

async function selectPreset(id: string) {
  await background.setPreset(id)
}

async function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Please choose an image file'
    return
  }
  if (file.size > 12 * 1024 * 1024) {
    uploadError.value = 'Image must be under 12 MB'
    return
  }

  uploading.value = true
  uploadError.value = ''
  try {
    const blob = await compressWallpaperFile(file)
    if (customPreviewUrl.value) URL.revokeObjectURL(customPreviewUrl.value)
    customPreviewUrl.value = URL.createObjectURL(blob)
    await background.setCustom(blob)
    activeCategory.value = 'custom'
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function clearWallpaper() {
  await background.clear()
}

async function removeCustomPhoto() {
  if (customPreviewUrl.value) {
    URL.revokeObjectURL(customPreviewUrl.value)
    customPreviewUrl.value = null
  }
  await background.removeCustom()
  if (activeCategory.value === 'custom') activeCategory.value = 'all'
}
</script>

<template>
  <div class="app-shell flex min-h-dvh flex-col">
    <header class="sticky top-0 z-10 border-b border-border-light bg-panel-light/90 px-4 py-3 backdrop-blur-xl dark:border-border-dark dark:bg-panel-dark/90">
      <div class="mx-auto flex max-w-3xl items-center gap-3">
        <RouterLink
          to="/settings"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-elevated-light text-text-secondary-light transition hover:text-blink-600 dark:bg-elevated-dark dark:text-text-secondary-dark dark:hover:text-blink-400"
          aria-label="Back to settings"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <div class="min-w-0 flex-1">
          <h1 class="font-display text-lg font-bold">Wallpapers</h1>
          <p class="truncate text-xs text-text-secondary-light dark:text-text-secondary-dark">
            {{ WALLPAPER_COUNT }} backgrounds · {{ background.label }}
          </p>
        </div>
        <button
          v-if="background.isActive"
          type="button"
          class="shrink-0 rounded-xl bg-elevated-light px-3 py-1.5 text-xs font-medium transition hover:ring-2 hover:ring-blink-500 dark:bg-elevated-dark"
          @click="clearWallpaper"
        >
          Remove
        </button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          v-model="query"
          type="search"
          placeholder="Search wallpapers…"
          class="min-w-0 flex-1 rounded-xl bg-elevated-light px-4 py-2.5 outline-none ring-1 ring-border-light transition placeholder:text-text-secondary-light focus:ring-2 focus:ring-blink-500 dark:bg-elevated-dark dark:ring-border-dark dark:placeholder:text-text-secondary-dark"
        >
        <label class="inline-flex cursor-pointer items-center justify-center rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blink-600/20 transition hover:opacity-90">
          {{ uploading ? 'Uploading…' : 'Upload photo' }}
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            :disabled="uploading"
            @change="onUpload"
          >
        </label>
      </div>
      <p v-if="uploadError" class="mb-3 text-sm text-red-500">{{ uploadError }}</p>

      <div class="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          v-for="chip in WALLPAPER_CATEGORIES"
          :key="chip.id"
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition"
          :class="activeCategory === chip.id
            ? 'gradient-brand text-white shadow-sm'
            : 'bg-elevated-light text-text-secondary-light hover:text-text-primary-light dark:bg-elevated-dark dark:text-text-secondary-dark dark:hover:text-text-primary-dark'"
          @click="activeCategory = chip.id"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Custom photo -->
      <section v-if="activeCategory === 'all' || activeCategory === 'custom'" class="mb-6">
        <h2 class="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
          Your photo
        </h2>
        <div v-if="customPreviewUrl" class="relative max-w-xs">
          <button
            type="button"
            class="block w-full overflow-hidden rounded-xl ring-1 transition"
            :class="background.isCustom
              ? 'ring-blink-500 ring-2'
              : 'ring-border-light dark:ring-border-dark'"
            @click="background.selectCustom()"
          >
            <img :src="customPreviewUrl" alt="Your wallpaper" class="aspect-[4/3] w-full object-cover">
          </button>
          <button
            type="button"
            class="mt-2 text-xs font-medium text-red-500 hover:underline"
            @click="removeCustomPhoto"
          >
            Delete uploaded photo
          </button>
        </div>
        <p v-else class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Upload a photo to use as your chat background.
        </p>
      </section>

      <p v-if="activeCategory !== 'custom'" class="mb-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
        {{ visibleWallpapers.length }} shown
      </p>

      <div v-if="activeCategory !== 'custom'" class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        <button
          v-for="item in visibleWallpapers"
          :key="item.id"
          type="button"
          class="overflow-hidden rounded-xl text-left ring-1 transition"
          :class="background.presetId === item.id
            ? 'ring-2 ring-blink-500'
            : 'ring-transparent hover:ring-border-light dark:hover:ring-border-dark'"
          @click="selectPreset(item.id)"
        >
          <img
            :src="item.thumb"
            :alt="item.name"
            loading="lazy"
            class="aspect-[4/3] w-full object-cover"
          >
          <span class="block truncate px-2 py-1.5 text-xs font-medium">{{ item.name }}</span>
        </button>
      </div>

      <p
        v-if="activeCategory !== 'custom' && visibleWallpapers.length === 0"
        class="py-12 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark"
      >
        No wallpapers match your search.
      </p>
    </main>
  </div>
</template>
