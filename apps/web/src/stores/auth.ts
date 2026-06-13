import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '@blinkr/shared'
import { api } from '@/lib/api'
import { AVATAR_IMAGE_OPTIONS, compressImage } from '@/lib/compress-image'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('blinkr-token'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(username: string, password: string) {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    })
    token.value = res.token
    user.value = res.user
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
    localStorage.setItem('blinkr-token', res.token)
  }

  async function fetchMe() {
    if (!token.value) return
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
      return
    }
    try {
      user.value = await api.get<User>('/auth/me')
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value = null
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
    localStorage.setItem('blinkr-token', 'demo-token')
  }

  async function uploadAvatar(file: File) {
    const compressed = await compressImage(file, AVATAR_IMAGE_OPTIONS)
    const form = new FormData()
    form.append('avatar', compressed)
    user.value = await api.upload<User>('/auth/avatar', form)
  }

  return { user, token, isAuthenticated, login, register, fetchMe, logout, enterDemoMode, uploadAvatar }
})
