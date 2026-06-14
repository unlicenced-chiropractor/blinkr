import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'system'

const MODE_KEY = 'blinkr-theme'

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(MODE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark'
}

function updateThemeColorMeta(isDark: boolean) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  meta.setAttribute('content', isDark ? '#000000' : '#faf9fc')
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const prefersDark = usePreferredDark()
  const isDark = ref(false)

  function apply() {
    const dark = mode.value === 'dark' || (mode.value === 'system' && prefersDark.value)
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    updateThemeColorMeta(dark)
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem(MODE_KEY, newMode)
    apply()
  }

  function init() {
    apply()
    watch([mode, prefersDark], apply)
  }

  function toggle() {
    setMode(isDark.value ? 'light' : 'dark')
  }

  return { mode, isDark, setMode, toggle, init }
})
