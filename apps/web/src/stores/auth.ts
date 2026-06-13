import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '@blinkr/shared'
import { api } from '@/lib/api'
import { ApiError } from '@/lib/api-error'
import { AVATAR_IMAGE_OPTIONS, compressImage } from '@/lib/compress-image'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('blinkr-token'))
  const sessionReady = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function fetchMe() {
    if (!token.value) return false

    if (token.value === 'demo-token') {
      if (!user.value) {
        user.value = {
          id: 'me',
          username: 'demo',
          displayName: 'You',
          avatarUrl: null,
          createdAt: new Date().toISOString(),
        }
      }
      return true
    }

    try {
      user.value = await api.get<User>('/auth/me')
      return true
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
        logout()
        return false
      }
      // Keep the stored token on transient/network errors if we already have a user
      return !!user.value
    }
  }

  async function initSession() {
    if (sessionReady.value) return
    await fetchMe()
    sessionReady.value = true
  }

  async function login(username: string, password: string) {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    })
    token.value = res.token
    user.value = res.user
    sessionReady.value = true
    localStorage.setItem('blinkr-token', res.token)
  }

  async function register(username: string, displayName: string, password: string) {
    const res = await api.post<{ token: string; user: User }>('/auth/register', {
      username,
      displayName,
      password,
    })
    token.value = res.token
    user.value = res.user
    sessionReady.value = true
    localStorage.setItem('blinkr-token', res.token)
  }

  function logout() {
    token.value = null
    user.value = null
    sessionReady.value = true
    localStorage.removeItem('blinkr-token')
  }

  function enterDemoMode() {
    const demoUser: User = {
      id: 'me',
      username: 'demo',
      displayName: 'You',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    }
    user.value = demoUser
    token.value = 'demo-token'
    sessionReady.value = true
    localStorage.setItem('blinkr-token', 'demo-token')
  }

  async function uploadAvatar(file: File) {
    const compressed = await compressImage(file, AVATAR_IMAGE_OPTIONS)
    const form = new FormData()
    form.append('avatar', compressed)
    user.value = await api.upload<User>('/auth/avatar', form)
  }

  return {
    user,
    token,
    sessionReady,
    isAuthenticated,
    initSession,
    login,
    register,
    fetchMe,
    logout,
    enterDemoMode,
    uploadAvatar,
  }
})
