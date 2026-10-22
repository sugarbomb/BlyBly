import { onBeforeUnmount, ref, shallowRef } from 'vue'

import type { RecommendationLoadContext, RecommendationPageLoader } from './types'

export function useRecommendationList<T>(
  loadPage: RecommendationPageLoader<T>,
  getItemKey: (item: T) => string | number | undefined,
) {
  const items = shallowRef<T[]>([])
  const loading = ref(false)
  const refreshing = ref(false)
  const noMore = ref(false)
  const addedCount = ref(0)
  const error = shallowRef<unknown>()
  const mode = ref<'replace' | 'append'>('replace')
  const source = ref<RecommendationLoadContext['source']>('initial')
  let cursor: unknown
  let controller: AbortController | undefined
  let currentRequest: Promise<void> | undefined
  let disposed = false
  let queuedRefresh: { source: RecommendationLoadContext['source'], count: number } | undefined
  let refreshRequest: Promise<void> | undefined

  function load(loadSource: RecommendationLoadContext['source'], count: number, commitReady?: Promise<void>): Promise<void> {
    if (disposed || (loadSource === 'bottom' && noMore.value))
      return Promise.resolve()
    if (loading.value)
      return currentRequest ?? Promise.resolve()

    const append = loadSource === 'bottom'
    source.value = loadSource
    mode.value = append ? 'append' : 'replace'
    loading.value = true
    error.value = undefined
    const requestController = new AbortController()
    controller = requestController

    // Start the loader in a microtask so the lock exists even for synchronous callbacks.
    currentRequest = Promise.resolve().then(async () => {
      try {
        const page = await loadPage({
          source: loadSource,
          mode: append ? 'append' : 'replace',
          count,
          cursor: append ? cursor : undefined,
          signal: requestController.signal,
        })
        if (disposed || requestController.signal.aborted)
          return

        const previous = append ? items.value : []
        const keys = new Set(previous.map(getItemKey).filter(key => key !== undefined))
        const incoming = page.items.filter((item) => {
          const key = getItemKey(item)
          if (key === undefined)
            return true
          if (keys.has(key))
            return false
          keys.add(key)
          return true
        })
        await commitReady
        if (disposed || requestController.signal.aborted)
          return
        items.value = [...previous, ...incoming]
        addedCount.value = incoming.length
        cursor = page.cursor
        noMore.value = !(page.hasMore ?? page.items.length > 0)
      }
      catch (cause) {
        await commitReady
        if (!disposed && !requestController.signal.aborted)
          error.value = cause
      }
      finally {
        if (controller === requestController) {
          controller = undefined
          currentRequest = undefined
        }
        if (!disposed)
          loading.value = false
      }
    })
    return currentRequest
  }

  function refresh(source: RecommendationLoadContext['source'], count: number): Promise<void> {
    if (disposed)
      return Promise.resolve()
    if (!loading.value && !refreshRequest)
      return load(source, count)

    queuedRefresh = { source, count }
    if (!refreshRequest) {
      refreshing.value = true
      refreshRequest = (async () => {
        while (queuedRefresh) {
          await currentRequest
          if (disposed)
            break
          const next = queuedRefresh
          queuedRefresh = undefined
          await load(next.source, next.count)
        }
      })().finally(() => {
        refreshing.value = false
        refreshRequest = undefined
      })
    }
    return refreshRequest
  }

  onBeforeUnmount(() => {
    disposed = true
    controller?.abort()
  })

  return { items, loading, refreshing, noMore, addedCount, error, mode, source, load, refresh }
}
