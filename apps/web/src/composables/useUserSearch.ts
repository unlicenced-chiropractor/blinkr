import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { UserSearchResponse, UserSearchResult } from '@blinkr/shared'
import { api } from '@/lib/api'

const MIN_QUERY_LEN = 2
const DEBOUNCE_MS = 300

function normalizeQuery(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase()
}

export function useUserSearch() {
  const query = ref('')
  const results = ref<UserSearchResult[]>([])
  const loading = ref(false)
  const hint = ref<string | null>(null)

  let abortController: AbortController | null = null
  let searchSeq = 0

  const runSearch = useDebounceFn(async (raw: string) => {
    const q = normalizeQuery(raw)

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

    const seq = ++searchSeq
    abortController?.abort()
    abortController = new AbortController()
    loading.value = true
    hint.value = null

    try {
      const res = await api.get<UserSearchResponse>(
        `/users/search?q=${encodeURIComponent(q)}`,
        abortController.signal,
      )

      // Ignore stale responses (aborted or superseded by a newer query)
      if (seq !== searchSeq) return
      if (normalizeQuery(query.value) !== q) return

      results.value = res.results
      if (!res.results.length) {
        hint.value = `No users matching @${res.query} — search from the start of the username`
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (seq !== searchSeq) return
      results.value = []
      hint.value = 'Search failed — try again'
    } finally {
      if (seq === searchSeq) loading.value = false
    }
  }, DEBOUNCE_MS)

  watch(query, (value) => {
    if (!value.trim()) {
      searchSeq++
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
    searchSeq++
    abortController?.abort()
    query.value = ''
    results.value = []
    hint.value = null
    loading.value = false
  }

  return { query, results, loading, hint, clear }
}
