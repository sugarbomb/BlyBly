export type RecommendationLoadTrigger = 'manual' | 'bottom' | 'wheel' | 'pull'

export interface RecommendationLoadContext {
  source: RecommendationLoadTrigger | 'initial'
  mode: 'replace' | 'append'
  count: number
  cursor?: unknown
  signal: AbortSignal
}

export interface RecommendationPage<T> {
  items: T[]
  hasMore?: boolean
  cursor?: unknown
}

export type RecommendationPageLoader<T> = (context: RecommendationLoadContext) => Promise<RecommendationPage<T>>

export interface RecommendationLayoutHandle<T> {
  refresh: (source?: RecommendationLoadTrigger | 'initial') => Promise<void>
  items: T[]
  loading: boolean
  noMore: boolean
}

export type RecommendationRegion = 'home' | 'guest' | 'tv' | 'partition'

export interface RecommendationControlSettings {
  showTools: boolean
  showNavigation: boolean
  toolsSide: 'left' | 'right'
  toolsHeight: number
  automaticBottom: boolean
  manualButton: boolean
  wheelEnabled: boolean
  pullEnabled: boolean
  bottomDistance: number
  wheelThreshold: number
  wheelConfirmThreshold: number
  pullThreshold: number
  pullConfirmThreshold: number
  wheelIndicator: boolean
  pullMotion: boolean
  autoFill: boolean
  fixedItems: number
  minItems: number
  maxItems: number
  extraRows: number
}

export interface RecommendationLayoutMetrics {
  columns: number
  rows: number
  itemCount: number
}

export interface RecommendationSizingOptions {
  height: number
  columns: number
  gap: number
  itemHeight: number
  minItems: number
  maxItems: number
  extraRows: number
  itemCount?: number
}

export function calculateRecommendationSize(options: RecommendationSizingOptions): RecommendationLayoutMetrics {
  const columns = Math.max(1, Math.floor(options.columns))
  const rows = Math.max(1, Math.ceil((Math.max(0, options.height) + options.gap) / Math.max(1, options.itemHeight + options.gap)))
    + Math.max(0, Math.floor(options.extraRows))
  const minItems = Math.max(1, Math.floor(options.minItems))
  const maxItems = Math.max(minItems, Math.floor(options.maxItems))

  return {
    columns,
    rows,
    itemCount: Math.min(maxItems, Math.max(minItems, options.itemCount === undefined ? columns * rows : Math.round(options.itemCount))),
  }
}
