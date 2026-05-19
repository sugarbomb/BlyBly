import { useStorage } from '@vueuse/core'
import { computed } from 'vue'

import { settings } from '~/logic'
import type { List as RankingVideoItem } from '~/models/video/ranking'
import type { List as RankingPgcItem } from '~/models/video/rankingPgc'
import type { List as TrendingVideoItem } from '~/models/video/trending'

export enum FilterScope {
  ExpiringGlobal = -1,
  Global = 0,
  Trending = 1,
  Ranking = 2,
  Weekly = 3,
  PartitionForYou = 4,
  PartitionRealtime = 5,
  ForYou = 6,
}

export type FilterDuration = 7 | 15 | 30
export type FilterRuleType = 'keyword' | 'uid' | 'title' | 'username'
export type CompactFilterKind = 'a' | 'k'
export type CompactFilterValue = string | [string, 0]

export interface FilterRule {
  id: string
  type: FilterRuleType
  value: string
  enabled: boolean
  scope?: FilterScope
  duration?: FilterDuration
  expiresAt?: string
}

export interface FilterOptions {
  enabled: boolean
  rules: FilterRule[]
}

export interface CompactFilterBucket {
  a?: CompactFilterValue[]
  k?: CompactFilterValue[]
}

type ExpiringFilterBuckets = Partial<Record<`${FilterDuration}`, Record<string, CompactFilterBucket>>>

export interface CompactFilterStore {
  v: 2
  /** Master switch. Scope switches are stored in `s`. */
  e: 0 | 1
  m?: 1
  s?: Record<string, 0 | 1>
  r: Record<string, CompactFilterBucket | ExpiringFilterBuckets | undefined>
}

interface ListRuleOptions {
  includeInherited?: boolean
  duration?: FilterDuration | 'all'
  includeExpired?: boolean
}

interface ClearRuleOptions {
  duration?: FilterDuration | 'all'
}

interface ImportResult {
  success: boolean
  imported?: number
  skipped?: number
  error?: string
}

interface SharedScopeRule {
  type: FilterRuleType
  value: string
  enabled: boolean
  duration?: FilterDuration
}

interface FilterableItem {
  id?: number | string
  aid?: number | string
  bvid?: string
  param?: number | string
  args?: {
    aid?: number | string
  }
  title?: string
  owner?: {
    name?: string
    mid?: number | string
  }
}

interface LegacyFilterStatus {
  hasV2: boolean
  hasV2Data: boolean
  hasLegacy: boolean
  hasNonEmptyLegacy: boolean
}

const FILTER_STORAGE_KEY = 'bewlybewly-filter-v2'

const defaultStore: CompactFilterStore = {
  v: 2,
  e: 1,
  r: {},
}

export const FILTER_SCOPE_OPTIONS = [
  { value: FilterScope.Global, label: '全局作用' },
  { value: FilterScope.Trending, label: '热门页' },
  { value: FilterScope.Ranking, label: '排行' },
  { value: FilterScope.Weekly, label: '周选集' },
  { value: FilterScope.PartitionForYou, label: '分区推荐' },
  { value: FilterScope.PartitionRealtime, label: '实时稿件' },
  { value: FilterScope.ForYou, label: '个性推荐' },
]

export const FILTER_DURATION_OPTIONS = [
  { value: 0, label: '永久' },
  { value: 7, label: '7 天' },
  { value: 15, label: '15 天' },
  { value: 30, label: '30 天' },
]

const legacyScopeMap: Record<string, FilterScope[]> = {
  'bewlybewly-filter-advance': [FilterScope.Global],
  'trending-filter': [FilterScope.Trending, FilterScope.Weekly],
  'ranking-filter': [FilterScope.Ranking],
  'foryou-filter': [FilterScope.PartitionForYou, FilterScope.PartitionRealtime, FilterScope.ForYou],
}

const pageScopes = [
  FilterScope.Trending,
  FilterScope.Ranking,
  FilterScope.Weekly,
  FilterScope.PartitionForYou,
  FilterScope.PartitionRealtime,
  FilterScope.ForYou,
] as const

const store = useStorage<CompactFilterStore>(
  FILTER_STORAGE_KEY,
  defaultStore,
  localStorage,
  { mergeDefaults: true },
)

let sharedScopeRules:
  | {
    type: 'bewlybewly-filter-scope-rules'
    version: '2.0'
    timestamp: number
    scope: FilterScope
    rules: SharedScopeRule[]
  }
  | null = null

function resolveScope(scopeOrKey: string | FilterScope | undefined): FilterScope {
  if (typeof scopeOrKey === 'number')
    return scopeOrKey

  if (scopeOrKey && legacyScopeMap[scopeOrKey]?.length)
    return legacyScopeMap[scopeOrKey][0]

  return FilterScope.Global
}

function getScopeKey(scope: FilterScope): string {
  return `${scope}`
}

function isMasterEnabled(): boolean {
  return store.value.e !== 0
}

function isScopeEnabled(scope: FilterScope): boolean {
  return store.value.s?.[getScopeKey(scope)] !== 0
}

function isFilteringEnabled(scope: FilterScope): boolean {
  return isMasterEnabled() && isScopeEnabled(scope)
}

function setScopeEnabled(scope: FilterScope, enabled: boolean) {
  store.value.s ??= {}
  store.value.s[getScopeKey(scope)] = enabled ? 1 : 0
}

function dateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(days: FilterDuration): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function isExpired(expiresAt?: string): boolean {
  return Boolean(expiresAt && expiresAt < dateKey())
}

function normalizeRuleType(type: FilterRuleType): CompactFilterKind {
  return type === 'uid' ? 'a' : 'k'
}

function toPublicRuleType(kind: CompactFilterKind): FilterRuleType {
  return kind === 'a' ? 'uid' : 'keyword'
}

function readStoredValue(value: CompactFilterValue): { value: string, enabled: boolean } {
  if (Array.isArray(value))
    return { value: value[0], enabled: value[1] !== 0 }

  return { value, enabled: true }
}

function createStoredValue(value: string, enabled = true): CompactFilterValue {
  return enabled ? value : [value, 0]
}

function ensureBucket(scope: Exclude<FilterScope, FilterScope.ExpiringGlobal>): CompactFilterBucket {
  const scopeKey = `${scope}`
  const bucket = store.value.r[scopeKey]
  if (bucket && !isExpiringBuckets(bucket))
    return bucket

  const nextBucket: CompactFilterBucket = {}
  store.value.r[scopeKey] = nextBucket
  return nextBucket
}

function ensureExpiringBucket(duration: FilterDuration, expiresAt: string): CompactFilterBucket {
  const expiring = ensureExpiringBuckets()
  const durationKey = `${duration}` as `${FilterDuration}`
  expiring[durationKey] ??= {}
  expiring[durationKey]![expiresAt] ??= {}
  return expiring[durationKey]![expiresAt]
}

function ensureExpiringBuckets(): ExpiringFilterBuckets {
  const scopeKey = `${FilterScope.ExpiringGlobal}`
  const bucket = store.value.r[scopeKey]
  if (bucket && isExpiringBuckets(bucket))
    return bucket

  const nextBucket: ExpiringFilterBuckets = {}
  store.value.r[scopeKey] = nextBucket
  return nextBucket
}

function isExpiringBuckets(value: CompactFilterBucket | ExpiringFilterBuckets): value is ExpiringFilterBuckets {
  return !Array.isArray((value as CompactFilterBucket).a) && !Array.isArray((value as CompactFilterBucket).k)
}

function getBucketValues(bucket: CompactFilterBucket, kind: CompactFilterKind): CompactFilterValue[] {
  bucket[kind] ??= []
  return bucket[kind]!
}

function valueKey(kind: CompactFilterKind, value: string): string {
  return kind === 'a' ? value.trim() : value.trim().toLowerCase()
}

function pushUnique(bucket: CompactFilterBucket, kind: CompactFilterKind, nextValue: CompactFilterValue): boolean {
  const values = getBucketValues(bucket, kind)
  const next = readStoredValue(nextValue)
  const nextKey = valueKey(kind, next.value)

  if (values.some(item => valueKey(kind, readStoredValue(item).value) === nextKey))
    return false

  values.push(nextValue)
  return true
}

function removeEmptyBucket(bucket: CompactFilterBucket) {
  if (bucket.a?.length === 0)
    delete bucket.a
  if (bucket.k?.length === 0)
    delete bucket.k
}

function removeBucketValue(bucket: CompactFilterBucket, kind: CompactFilterKind, targetValueKey: string) {
  const values = bucket[kind]
  if (!values)
    return false

  const nextValues = values.filter((item) => {
    const parsed = readStoredValue(item)
    return valueKey(kind, parsed.value) !== targetValueKey
  })

  const changed = nextValues.length !== values.length
  bucket[kind] = nextValues
  removeEmptyBucket(bucket)
  return changed
}

function addStoredRule(
  scope: FilterScope,
  kind: CompactFilterKind,
  value: string,
  enabled = true,
  duration?: FilterDuration,
): boolean {
  const normalizedValue = value.trim()
  if (!normalizedValue)
    return false

  if (scope === FilterScope.ExpiringGlobal) {
    const finalDuration = duration ?? 7
    return pushUnique(
      ensureExpiringBucket(finalDuration, addDays(finalDuration)),
      kind,
      createStoredValue(normalizedValue, enabled),
    )
  }

  return pushUnique(
    ensureBucket(scope),
    kind,
    createStoredValue(normalizedValue, enabled),
  )
}

function createRuleId(
  scope: FilterScope,
  kind: CompactFilterKind,
  index: number,
  value: string,
  duration?: FilterDuration,
  expiresAt?: string,
): string {
  return [
    scope,
    duration ?? '',
    expiresAt ?? '',
    kind,
    index,
    encodeURIComponent(value),
  ].join('|')
}

function parseRuleId(id: string) {
  const [scope, duration, expiresAt, kind, index, encodedValue] = id.split('|')
  if (kind !== 'a' && kind !== 'k')
    return null

  return {
    scope: Number(scope) as FilterScope,
    duration: duration ? Number(duration) as FilterDuration : undefined,
    expiresAt: expiresAt || undefined,
    kind: kind as CompactFilterKind,
    index: Number(index),
    value: decodeURIComponent(encodedValue ?? ''),
  }
}

function listBucketRules(
  bucket: CompactFilterBucket,
  scope: FilterScope,
  duration?: FilterDuration,
  expiresAt?: string,
): FilterRule[] {
  return (['a', 'k'] as CompactFilterKind[]).flatMap((kind) => {
    const values = bucket[kind] ?? []
    return values.map((item, index) => {
      const parsed = readStoredValue(item)
      return {
        id: createRuleId(scope, kind, index, parsed.value, duration, expiresAt),
        type: toPublicRuleType(kind),
        value: parsed.value,
        enabled: parsed.enabled,
        scope,
        duration,
        expiresAt,
      }
    })
  })
}

function listRulesForScope(scope: FilterScope, options: ListRuleOptions = {}): FilterRule[] {
  const { includeInherited = true, duration = 'all', includeExpired = false } = options
  const rules: FilterRule[] = []

  if (includeInherited && scope !== FilterScope.Global && scope !== FilterScope.ExpiringGlobal)
    rules.push(...listRulesForScope(FilterScope.Global, { includeInherited: false, includeExpired }))

  if (includeInherited && scope !== FilterScope.ExpiringGlobal)
    rules.push(...listRulesForScope(FilterScope.ExpiringGlobal, { includeInherited: false, duration: 'all', includeExpired }))

  if (scope === FilterScope.ExpiringGlobal) {
    const expiring = store.value.r[`${FilterScope.ExpiringGlobal}`]
    if (!expiring || !isExpiringBuckets(expiring))
      return rules

    for (const [durationKey, datedBuckets] of Object.entries(expiring)) {
      const currentDuration = Number(durationKey) as FilterDuration
      if (duration !== 'all' && duration !== currentDuration)
        continue

      for (const [expiresAt, bucket] of Object.entries(datedBuckets ?? {})) {
        if (!includeExpired && isExpired(expiresAt))
          continue

        rules.push(...listBucketRules(bucket, FilterScope.ExpiringGlobal, currentDuration, expiresAt))
      }
    }
    return rules
  }

  const bucket = store.value.r[`${scope}`]
  if (bucket && !isExpiringBuckets(bucket))
    rules.push(...listBucketRules(bucket, scope))

  return rules
}

function getMutableRuleList(rule: FilterRule) {
  const parsed = parseRuleId(rule.id)
  if (!parsed)
    return null

  if (parsed.scope === FilterScope.ExpiringGlobal) {
    if (!parsed.duration || !parsed.expiresAt)
      return null

    const expiring = store.value.r[`${FilterScope.ExpiringGlobal}`]
    if (!expiring || !isExpiringBuckets(expiring))
      return null

    const list: CompactFilterValue[] | undefined = expiring[`${parsed.duration}`]?.[parsed.expiresAt]?.[parsed.kind]
    return list ? { list, parsed } : null
  }

  const bucket = store.value.r[`${parsed.scope}`]
  if (!bucket || isExpiringBuckets(bucket))
    return null

  const list: CompactFilterValue[] | undefined = bucket[parsed.kind]
  return list ? { list, parsed } : null
}

function findRuleById(id: string): FilterRule | null {
  const parsed = parseRuleId(id)
  if (!parsed)
    return null

  return listRulesForScope(parsed.scope, {
    includeInherited: false,
    duration: parsed.duration ?? 'all',
    includeExpired: true,
  }).find(rule => rule.id === id) ?? null
}

function normalizeImportedRule(rule: any): { kind: CompactFilterKind, value: string, enabled: boolean } | null {
  if (!rule || typeof rule.value !== 'string')
    return null

  const type = rule.type as FilterRuleType | undefined
  if (type && !['keyword', 'uid', 'title', 'username'].includes(type))
    return null

  return {
    kind: normalizeRuleType(type ?? 'keyword'),
    value: rule.value,
    enabled: typeof rule.enabled === 'boolean' ? rule.enabled : true,
  }
}

function importLegacyRules(rules: any[], scopes: FilterScope[]): { imported: number, skipped: number } {
  let imported = 0
  let skipped = 0

  for (const rule of rules) {
    const normalized = normalizeImportedRule(rule)
    if (!normalized) {
      skipped++
      continue
    }

    for (const scope of scopes) {
      if (addStoredRule(scope, normalized.kind, normalized.value, normalized.enabled))
        imported++
      else
        skipped++
    }
  }

  return { imported, skipped }
}

function importSharedRulesToScope(rules: SharedScopeRule[], targetScope: FilterScope): { imported: number, skipped: number } {
  let imported = 0
  let skipped = 0

  for (const rule of rules) {
    const normalized = normalizeImportedRule(rule)
    if (!normalized) {
      skipped++
      continue
    }

    const duration = targetScope === FilterScope.ExpiringGlobal ? rule.duration ?? 7 : undefined
    const added = addStoredRule(
      targetScope,
      normalized.kind,
      normalized.value,
      normalized.enabled,
      duration,
    )

    if (added)
      imported++
    else
      skipped++
  }

  return { imported, skipped }
}

function getLegacyStorageRuleCount(key: string): number {
  try {
    const raw = localStorage.getItem(key)
    if (!raw)
      return 0

    const legacy = JSON.parse(raw) as { rules?: unknown }
    return Array.isArray(legacy.rules) ? legacy.rules.length : 0
  }
  catch {
    return 0
  }
}

function getV2DataStatus(): { hasV2: boolean, hasV2Data: boolean } {
  const raw = localStorage.getItem(FILTER_STORAGE_KEY)
  if (!raw)
    return { hasV2: false, hasV2Data: false }

  try {
    const data = JSON.parse(raw) as CompactFilterStore
    const hasRules = Object.values(data.r ?? {}).some((bucket) => {
      if (!bucket)
        return false

      if (isExpiringBuckets(bucket)) {
        return Object.values(bucket).some((datedBuckets) => {
          return Object.values(datedBuckets ?? {}).some((expiringBucket) => {
            return (expiringBucket.a?.length ?? 0) > 0 || (expiringBucket.k?.length ?? 0) > 0
          })
        })
      }

      return (bucket.a?.length ?? 0) > 0 || (bucket.k?.length ?? 0) > 0
    })
    const hasScopeSwitches = Object.keys(data.s ?? {}).length > 0

    return {
      hasV2: true,
      hasV2Data: hasRules || hasScopeSwitches,
    }
  }
  catch {
    return { hasV2: true, hasV2Data: true }
  }
}

function getLegacyFilterStatus(): LegacyFilterStatus {
  const legacyStorageKeys = Object.keys(legacyScopeMap)
  const hasLegacyStorageKey = legacyStorageKeys.some(key => localStorage.getItem(key) !== null)
  const legacyStorageRuleCount = legacyStorageKeys.reduce((count, key) => count + getLegacyStorageRuleCount(key), 0)
  const legacySettingsRuleCount = settings.value.filterByTitle.length + settings.value.filterByUser.length
  const v2Status = getV2DataStatus()

  return {
    ...v2Status,
    hasLegacy: hasLegacyStorageKey || legacySettingsRuleCount > 0,
    hasNonEmptyLegacy: legacyStorageRuleCount + legacySettingsRuleCount > 0,
  }
}

function clearLegacySources(): number {
  let cleaned = 0

  for (const key of Object.keys(legacyScopeMap)) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key)
      cleaned++
    }
  }

  if (
    settings.value.filterByTitle.length > 0
    || settings.value.filterByUser.length > 0
    || settings.value.enableFilterByTitle
    || settings.value.enableFilterByUser
  ) {
    settings.value.filterByTitle = []
    settings.value.filterByUser = []
    settings.value.enableFilterByTitle = false
    settings.value.enableFilterByUser = false
    cleaned++
  }

  return cleaned
}

function migrateLegacySources(clearLegacy = false) {
  let imported = 0
  let skipped = 0

  for (const [key, scopes] of Object.entries(legacyScopeMap)) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw)
        continue

      const legacy = JSON.parse(raw) as { enabled?: boolean, rules?: any[] }
      const enabled = typeof legacy.enabled === 'boolean'
        ? legacy.enabled
        : Array.isArray(legacy.rules) && legacy.rules.length > 0
      for (const scope of scopes)
        setScopeEnabled(scope, enabled)
      if (Array.isArray(legacy.rules)) {
        const result = importLegacyRules(legacy.rules, scopes)
        imported += result.imported
        skipped += result.skipped
      }
    }
    catch {
      // Ignore malformed legacy data. The old keys are left untouched.
    }
  }

  for (const item of settings.value.filterByTitle) {
    if (addStoredRule(FilterScope.Global, 'k', item.keyword, true))
      imported++
    else
      skipped++
  }

  for (const item of settings.value.filterByUser) {
    const kind = /^\d+$/.test(item.keyword.trim()) ? 'a' : 'k'
    if (addStoredRule(FilterScope.Global, kind, item.keyword, true))
      imported++
    else
      skipped++
  }

  if (settings.value.filterByTitle.length > 0 || settings.value.filterByUser.length > 0)
    setScopeEnabled(FilterScope.Global, settings.value.enableFilterByTitle || settings.value.enableFilterByUser)

  store.value.m = 1

  return {
    imported,
    skipped,
    cleaned: clearLegacy ? clearLegacySources() : 0,
  }
}

function matchesText(value: string | number | undefined | null, keyword: string): boolean {
  if (value === undefined || value === null)
    return false

  const raw = `${value}`
  if (keyword.startsWith('/') && keyword.endsWith('/') && keyword.length > 2) {
    try {
      return new RegExp(keyword.slice(1, -1), 'i').test(raw)
    }
    catch {
      return false
    }
  }

  return raw.toLowerCase().includes(keyword.toLowerCase())
}

function normalizeIdentifier(value: string | number | undefined | null): string {
  return `${value ?? ''}`.trim().toLowerCase()
}

function matchesVideoIdentifier(item: FilterableItem, keyword: string): boolean {
  const normalizedKeyword = normalizeIdentifier(keyword)
  if (!normalizedKeyword)
    return false

  const numericIds = [item.aid, item.id, item.param, item.args?.aid]
    .map(value => normalizeIdentifier(value))
    .filter(Boolean)

  return [
    normalizeIdentifier(item.bvid),
    ...numericIds,
    ...numericIds.map(id => `av${id}`),
  ].includes(normalizedKeyword)
}

function matchesRule(
  rule: Pick<FilterRule, 'type' | 'value' | 'enabled'>,
  item: FilterableItem,
): boolean {
  if (!rule.enabled)
    return false

  if (rule.type === 'uid')
    return item.owner?.mid !== undefined && item.owner?.mid !== null && `${item.owner.mid}` === rule.value

  if (matchesVideoIdentifier(item, rule.value))
    return true

  return matchesText(item.title, rule.value) || matchesText(item.owner?.name, rule.value)
}

function importCompactStore(importData: CompactFilterStore): ImportResult {
  if (importData.v !== 2 || !importData.r)
    return { success: false, error: '无效的数据格式' }

  let imported = 0
  let skipped = 0

  for (const [scopeKey, bucket] of Object.entries(importData.r)) {
    if (!bucket)
      continue

    const scope = Number(scopeKey) as FilterScope
    if (scope === FilterScope.ExpiringGlobal && isExpiringBuckets(bucket)) {
      for (const [durationKey, datedBuckets] of Object.entries(bucket)) {
        const duration = Number(durationKey) as FilterDuration
        if (![7, 15, 30].includes(duration))
          continue

        for (const [expiresAt, expiringBucket] of Object.entries(datedBuckets ?? {})) {
          const targetBucket = ensureExpiringBucket(duration, expiresAt)
          for (const kind of ['a', 'k'] as CompactFilterKind[]) {
            for (const value of expiringBucket[kind] ?? []) {
              if (pushUnique(targetBucket, kind, value))
                imported++
              else
                skipped++
            }
          }
        }
      }
      continue
    }

    if (!Object.values(FilterScope).includes(scope) || isExpiringBuckets(bucket)) {
      skipped++
      continue
    }

    const targetBucket = ensureBucket(scope as Exclude<FilterScope, FilterScope.ExpiringGlobal>)
    for (const kind of ['a', 'k'] as CompactFilterKind[]) {
      for (const value of bucket[kind] ?? []) {
        if (pushUnique(targetBucket, kind, value))
          imported++
        else
          skipped++
      }
    }
  }

  if (typeof importData.e === 'number')
    store.value.e = importData.e ? 1 : 0
  if (importData.s) {
    store.value.s ??= {}
    for (const [scopeKey, enabled] of Object.entries(importData.s))
      store.value.s[scopeKey] = enabled ? 1 : 0
  }

  return { success: true, imported, skipped }
}

function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function pruneBucket(bucket: CompactFilterBucket) {
  const seen = new Set<string>()

  for (const kind of ['a', 'k'] as CompactFilterKind[]) {
    bucket[kind] = (bucket[kind] ?? []).filter((item) => {
      const parsed = readStoredValue(item)
      const key = `${kind}:${valueKey(kind, parsed.value)}`
      if (!parsed.value.trim() || seen.has(key))
        return false

      seen.add(key)
      return true
    })
    removeEmptyBucket(bucket)
  }
}

function cleanupExpiredRules(): number {
  const expiring = store.value.r[`${FilterScope.ExpiringGlobal}`]
  if (!expiring || !isExpiringBuckets(expiring))
    return 0

  let expiredGroups = 0

  for (const [durationKey, datedBuckets] of Object.entries(expiring)) {
    for (const expiresAt of Object.keys(datedBuckets ?? {})) {
      if (!isExpired(expiresAt))
        continue

      delete datedBuckets?.[expiresAt]
      expiredGroups++
    }

    if (Object.keys(datedBuckets ?? {}).length === 0)
      delete expiring[durationKey as `${FilterDuration}`]
  }

  return expiredGroups
}

cleanupExpiredRules()

export function useFilterAdvance(scopeOrKey: string | FilterScope = FilterScope.Global) {
  const scope = resolveScope(scopeOrKey)

  const options = computed<FilterOptions>({
    get() {
      return {
        enabled: isFilteringEnabled(scope),
        rules: listRulesForScope(scope),
      }
    },
    set(value) {
      setScopeEnabled(scope, value.enabled)
    },
  })

  const addRule = (rule: Omit<FilterRule, 'id'>) => {
    return addStoredRule(
      rule.duration ? FilterScope.ExpiringGlobal : (rule.scope ?? scope),
      normalizeRuleType(rule.type),
      rule.value,
      rule.enabled,
      rule.duration,
    )
  }

  const removeRule = (id: string) => {
    const rule = findRuleById(id)
    if (!rule)
      return

    const result = getMutableRuleList(rule)
    if (!result)
      return

    const { list, parsed } = result
    const index = list.findIndex((item, currentIndex) => {
      const value = readStoredValue(item).value
      return (currentIndex === parsed.index && value === parsed.value) || value === parsed.value
    })

    if (index !== -1)
      list.splice(index, 1)
  }

  const updateRule = (id: string, updates: Partial<Omit<FilterRule, 'id'>>) => {
    const rule = findRuleById(id)
    if (!rule)
      return

    const result = getMutableRuleList(rule)
    if (!result)
      return

    const { list, parsed } = result
    const targetIndex = list.findIndex((item, currentIndex) => {
      const value = readStoredValue(item).value
      return (currentIndex === parsed.index && value === parsed.value) || value === parsed.value
    })

    if (targetIndex === -1)
      return

    const current = readStoredValue(list[targetIndex])
    list[targetIndex] = createStoredValue(
      updates.value?.trim() || current.value,
      updates.enabled ?? current.enabled,
    )
  }

  const toggleRule = (id: string) => {
    const rule = findRuleById(id)
    if (!rule)
      return

    updateRule(id, { enabled: !rule.enabled })
  }

  const toggleEnabled = () => {
    store.value.e = store.value.e ? 0 : 1
  }

  const setEnabled = (enabled: boolean) => {
    store.value.e = enabled ? 1 : 0
  }

  const toggleScopeEnabled = (targetScope: FilterScope = scope) => {
    setScopeEnabled(targetScope, !isScopeEnabled(targetScope))
  }

  const exportToSharedSpace = (targetScope: FilterScope = scope) => {
    const rules = listRulesForScope(targetScope, {
      includeInherited: false,
      duration: 'all',
    }).map((rule): SharedScopeRule => ({
      type: rule.type,
      value: rule.value,
      enabled: rule.enabled,
      duration: rule.duration,
    }))

    sharedScopeRules = {
      type: 'bewlybewly-filter-scope-rules',
      version: '2.0',
      timestamp: Date.now(),
      scope: targetScope,
      rules,
    }
    return { success: true, count: rules.length }
  }

  const importFromSharedSpace = (targetScope: FilterScope = scope): ImportResult => {
    try {
      if (!sharedScopeRules)
        return { success: false, error: '共享空间为空' }

      if (sharedScopeRules.type === 'bewlybewly-filter-scope-rules' && Array.isArray(sharedScopeRules.rules)) {
        const result = importSharedRulesToScope(sharedScopeRules.rules, targetScope)
        return { success: true, ...result }
      }

      return { success: false, error: '无效的数据格式' }
    }
    catch {
      return { success: false, error: '解析数据失败' }
    }
  }

  const exportToFile = () => {
    downloadJson(store.value, `bewlybewly-filters-${new Date().toISOString().split('T')[0]}.json`)
    return { success: true, count: listRulesForScope(scope).length }
  }

  const importFromFile = (file: File): Promise<ImportResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const importData = JSON.parse(text)

          if (importData.type === 'bewlybewly-filter-rules' && Array.isArray(importData.rules)) {
            resolve({ success: true, ...importLegacyRules(importData.rules, [scope]) })
            return
          }

          resolve(importCompactStore(importData))
        }
        catch {
          resolve({ success: false, error: '解析文件失败' })
        }
      }
      reader.onerror = () => resolve({ success: false, error: '读取文件失败' })
      reader.readAsText(file)
    })
  }

  const clearSharedSpace = () => {
    sharedScopeRules = null
  }

  const clearAllRules = (targetScope: FilterScope = scope, clearOptions: ClearRuleOptions = {}) => {
    if (targetScope === FilterScope.ExpiringGlobal) {
      const expiring = ensureExpiringBuckets()
      if (!clearOptions.duration || clearOptions.duration === 'all') {
        store.value.r[`${FilterScope.ExpiringGlobal}`] = {}
        return
      }
      delete expiring[`${clearOptions.duration}`]
      return
    }

    store.value.r[`${targetScope}`] = {}
  }

  const organizeRules = () => {
    let expiredGroups = 0
    let promotedRules = 0
    const legacyStatus = getLegacyFilterStatus()

    for (const [scopeKey, bucket] of Object.entries(store.value.r)) {
      if (!bucket)
        continue

      if (scopeKey === `${FilterScope.ExpiringGlobal}` && isExpiringBuckets(bucket)) {
        for (const [durationKey, datedBuckets] of Object.entries(bucket)) {
          for (const [expiresAt, expiringBucket] of Object.entries(datedBuckets ?? {})) {
            if (isExpired(expiresAt)) {
              delete datedBuckets?.[expiresAt]
              expiredGroups++
              continue
            }
            pruneBucket(expiringBucket)
          }
          if (Object.keys(datedBuckets ?? {}).length === 0)
            delete bucket[durationKey as `${FilterDuration}`]
        }
        continue
      }

      if (!isExpiringBuckets(bucket))
        pruneBucket(bucket)
    }

    const globalBucket = ensureBucket(FilterScope.Global)

    for (const kind of ['a', 'k'] as CompactFilterKind[]) {
      const commonKeys = new Set<string>()
      const keyToValue = new Map<string, CompactFilterValue>()

      pageScopes.forEach((currentScope, index) => {
        const bucket = store.value.r[`${currentScope}`]
        const activeEntries = new Map<string, CompactFilterValue>()

        if (bucket && !isExpiringBuckets(bucket)) {
          for (const item of bucket[kind] ?? []) {
            const parsed = readStoredValue(item)
            if (!parsed.enabled)
              continue

            activeEntries.set(valueKey(kind, parsed.value), item)
          }
        }

        if (index === 0) {
          activeEntries.forEach((item, key) => {
            commonKeys.add(key)
            keyToValue.set(key, item)
          })
          return
        }

        for (const key of [...commonKeys]) {
          if (!activeEntries.has(key)) {
            commonKeys.delete(key)
            keyToValue.delete(key)
          }
        }
      })

      for (const key of commonKeys) {
        const value = keyToValue.get(key)
        if (!value)
          continue

        const promoted = pushUnique(globalBucket, kind, value)
        let removedFromPage = false

        for (const currentScope of pageScopes) {
          const bucket = store.value.r[`${currentScope}`]
          if (bucket && !isExpiringBuckets(bucket))
            removedFromPage = removeBucketValue(bucket, kind, key) || removedFromPage
        }

        if (promoted || removedFromPage)
          promotedRules++
      }
    }

    return {
      expiredGroups,
      promotedRules,
      cleanedLegacyKeys: legacyStatus.hasV2Data || !legacyStatus.hasNonEmptyLegacy ? clearLegacySources() : 0,
    }
  }

  const getLegacyStatus = () => getLegacyFilterStatus()

  const convertLegacyFilters = () => migrateLegacySources(true)

  const matchesPgcRules = (pgc: RankingPgcItem): boolean => {
    const activeRules = options.value.rules.filter(rule => rule.enabled && isFilteringEnabled(rule.scope ?? scope))

    if (activeRules.length === 0)
      return false

    return activeRules.some(rule => rule.type !== 'uid' && matchesText(pgc.title, rule.value))
  }

  const shouldFilterItem = (item: FilterableItem): boolean => {
    if (!options.value.enabled || options.value.rules.length === 0)
      return false

    const activeRules = options.value.rules.filter(rule => rule.enabled && isFilteringEnabled(rule.scope ?? scope))

    if (activeRules.length === 0)
      return false

    return activeRules.some(rule => matchesRule(rule, item))
  }

  const filterVideos = <T extends RankingVideoItem | TrendingVideoItem>(videos: T[]): T[] => {
    if (!options.value.enabled || options.value.rules.length === 0)
      return videos

    return videos.filter(video => !shouldFilterItem(video))
  }

  const filterPgcList = (pgcList: RankingPgcItem[]): RankingPgcItem[] => {
    if (!options.value.enabled || options.value.rules.length === 0)
      return pgcList

    return pgcList.filter(pgc => !matchesPgcRules(pgc))
  }

  return {
    options,
    store,
    addRule,
    removeRule,
    updateRule,
    toggleRule,
    toggleEnabled,
    setEnabled,
    isFilteringEnabled,
    isScopeEnabled,
    setScopeEnabled,
    toggleScopeEnabled,
    exportToSharedSpace,
    importFromSharedSpace,
    exportToFile,
    importFromFile,
    clearSharedSpace,
    clearAllRules,
    organizeRules,
    getLegacyStatus,
    convertLegacyFilters,
    listRules: listRulesForScope,
    matchesRule,
    shouldFilterItem,
    filterVideos,
    filterPgcList,
  }
}
