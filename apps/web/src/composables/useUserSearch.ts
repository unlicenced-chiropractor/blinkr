import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { UserSearchResponse, UserSearchResult } from '@blinkr/shared'
import { api } from '@/lib/api'

const MIN_QUERY_LEN = 2
const DEBOUNCE_MS = 350

export function useUserSearch() {
  const query = ref('')
  const results = ref<UserSearchResult[]>([])
  const loading = ref(false)
  const hint = ref<string | null>(null)

  let abortController: AbortController | null = null

  const runSearch = useDebounceFn(async (raw: string) => {
    const q = raw.trim().replace(/^@+/, '').toLowerCase()

    if (!q) {
      results.value = []
      hint.value = null
      loading.value = false
      return
    }

    if (q.length < MIN_QUERY_LEN) {
      results.value = []
      hint.value = `Type at least ${MIN_QUERY_LEN} characters`
      loading.value = false
      return
    }

    if (!/^[a-z0-9_]*$/i.test(q)) {
      results.value = []
      hint.value = 'Usernames can only contain letters, numbers, and _'
      loading.value = false
      return
    }

    abortController?.abort()
    abortController = new AbortController()
    loading.value = true
    hint.value = null

    try {
      const res = await api.get<UserSearchResponse>(
        `/users/search?q=${encodeURIComponent(q)}`,
        abortController.signal,
      )
      results.value = res.results
      if (!res.results.length) {
        hint.value = `No users found for @${res.query}`
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      results.value = []
      hint.value = 'Search failed — try again'
    } finally {
      loading.value = false
    }
  }, DEBOUNCE_MS)

  watch(query, (value) => {
    if (!value.trim()) {
      abortController?.abort()
      results.value = []
      hint.value = null
      loading.value = false
      return
    }
    loading.value = true
    runSearch(value)
  })

  function clear() {
    abortController?.abort()
    query.value = ''
    results.value = []
    hint.value = null
    loading.value = false
  }

  return { query, results, loading, hint, clear }
}
