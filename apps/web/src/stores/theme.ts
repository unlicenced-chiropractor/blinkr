import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import {
  DEFAULT_THEME_PALETTE,
  isThemePalette,
  type ThemePalette,
} from '@/lib/themes'

export type ThemeMode = 'light' | 'dark' | 'system'

const MODE_KEY = 'blinkr-theme'
const PALETTE_KEY = 'blinkr-palette'

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(MODE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark'
}

function readStoredPalette(): ThemePalette {
  const stored = localStorage.getItem(PALETTE_KEY)
  return isThemePalette(stored) ? stored : DEFAULT_THEME_PALETTE
}

function updateThemeColorMeta(isDark: boolean) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  if (!isDark) {
    meta.setAttribute('content', '#faf9fc')
    return
  }
  const surface = getComputedStyle(document.documentElement)
    .getPropertyValue('--theme-surface-dark')
    .trim()
  meta.setAttribute('content', surface || '#000000')
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const palette = ref<ThemePalette>(readStoredPalette())
  const prefersDark = usePreferredDark()
  const isDark = ref(false)

  function apply() {
    const dark = mode.value === 'dark' || (mode.value === 'system' && prefersDark.value)
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.theme = palette.value
    updateThemeColorMeta(dark)
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem(MODE_KEY, newMode)
    apply()
  }

  function setPalette(newPalette: ThemePalette) {
    palette.value = newPalette
    localStorage.setItem(PALETTE_KEY, newPalette)
    apply()
  }

  function init() {
    apply()
    watch([mode, palette, prefersDark], apply)
  }

  function toggle() {
    setMode(isDark.value ? 'light' : 'dark')
  }

  return { mode, palette, isDark, setMode, setPalette, toggle, init }
})
