import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  deleteCustomWallpaperBlob,
  loadCustomWallpaperBlob,
  saveCustomWallpaperBlob,
} from '@/lib/background-db'
import { getWallpaperPreset } from '@/lib/wallpapers'

const STORAGE_KEY = 'blinkr-wallpaper'
const CUSTOM_ID = 'custom'

export type WallpaperSelection = { type: 'none' }
  | { type: 'preset'; id: string }
  | { type: 'custom' }

function readSelection(): WallpaperSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw || raw === 'none') return { type: 'none' }
    if (raw === CUSTOM_ID) return { type: 'custom' }
    if (getWallpaperPreset(raw)) return { type: 'preset', id: raw }
    return { type: 'none' }
  } catch {
    return { type: 'none' }
  }
}

function persistSelection(sel: WallpaperSelection) {
  if (sel.type === 'none') localStorage.removeItem(STORAGE_KEY)
  else if (sel.type === 'custom') localStorage.setItem(STORAGE_KEY, CUSTOM_ID)
  else localStorage.setItem(STORAGE_KEY, sel.id)
}

function syncWallpaperClass(active: boolean) {
  document.documentElement.classList.toggle('has-wallpaper', active)
}

export const useBackgroundStore = defineStore('background', () => {
  const selection = ref<WallpaperSelection>(readSelection())
  const imageUrl = ref<string | null>(null)
  const customObjectUrl = ref<string | null>(null)
  const ready = ref(false)

  const isActive = computed(() => selection.value.type !== 'none')
  const presetId = computed(() => (selection.value.type === 'preset' ? selection.value.id : null))
  const isCustom = computed(() => selection.value.type === 'custom')

  const label = computed(() => {
    if (selection.value.type === 'none') return 'Default'
    if (selection.value.type === 'custom') return 'Your photo'
    return getWallpaperPreset(selection.value.id)?.name ?? 'Wallpaper'
  })

  function revokeCustomUrl() {
    if (customObjectUrl.value) {
      URL.revokeObjectURL(customObjectUrl.value)
      customObjectUrl.value = null
    }
  }

  async function resolveImageUrl(): Promise<string | null> {
    if (selection.value.type === 'none') return null
    if (selection.value.type === 'preset') {
      return getWallpaperPreset(selection.value.id)?.url ?? null
    }
    const blob = await loadCustomWallpaperBlob()
    if (!blob) return null
    revokeCustomUrl()
    customObjectUrl.value = URL.createObjectURL(blob)
    return customObjectUrl.value
  }

  async function apply() {
    imageUrl.value = await resolveImageUrl()
    syncWallpaperClass(!!imageUrl.value)
  }

  async function init() {
    await apply()
    ready.value = true
  }

  async function setPreset(id: string) {
    selection.value = { type: 'preset', id }
    persistSelection(selection.value)
    await apply()
  }

  async function setCustom(blob: Blob) {
    await saveCustomWallpaperBlob(blob)
    selection.value = { type: 'custom' }
    persistSelection(selection.value)
    await apply()
  }

  async function selectCustom() {
    const blob = await loadCustomWallpaperBlob()
    if (!blob) return
    selection.value = { type: 'custom' }
    persistSelection(selection.value)
    await apply()
  }

  async function clear() {
    revokeCustomUrl()
    selection.value = { type: 'none' }
    persistSelection(selection.value)
    imageUrl.value = null
    syncWallpaperClass(false)
  }

  async function removeCustom() {
    await deleteCustomWallpaperBlob()
    if (selection.value.type === 'custom') await clear()
  }

  return {
    selection,
    imageUrl,
    ready,
    isActive,
    presetId,
    isCustom,
    label,
    init,
    setPreset,
    setCustom,
    selectCustom,
    clear,
    removeCustom,
  }
})
