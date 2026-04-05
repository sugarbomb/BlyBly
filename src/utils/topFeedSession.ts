export const DEFAULT_TOP_FEED_PATH = '/x/web-interface/wbi/index/top/feed/rcmd'

export const TOP_FEED_DEFAULT_STATIC_PARAMS = Object.freeze({
  web_location: '1430650',
  fresh_type: '3',
  feed_version: 'V8',
  fetch_row: '1',
  device: 'win',
  homepage_ver: '1',
  ps: '10',
  screen: '1920-1080',
  seo_info: '',
  tt_exp: '',
})

type TopFeedItemLike = Record<string, any>

export interface TopFeedPayloadLike {
  data?: {
    item?: TopFeedItemLike[]
  }
}

interface TopFeedSessionState {
  uniqId: string
  requestCount: number
  requestCount1h: number
  brushCount: number
  seenCount: number
  hourWindowStartedAt: number
  lastShowlistTokens: string[]
  lastClickTokens: string[]
}

interface TopFeedStaticParams {
  web_location: string
  fresh_type: string
  feed_version: string
  fetch_row: string
  device: string
  homepage_ver: string
  ps: string
  screen: string
  seo_info: string
  tt_exp: string
}

export interface TopFeedSessionOptions {
  now?: () => number
  random?: () => number
  ps?: number | string
  showListLimit?: number | string
  clickListLimit?: number | string
  uniqId?: string
  requestCount?: number | string
  requestCount1h?: number | string
  brushCount?: number | string
  seenCount?: number | string
  hourWindowStartedAt?: number | string
  lastShowlistTokens?: string[]
  lastClickTokens?: string[]
  webLocation?: string
  freshType?: number | string
  feedVersion?: string
  fetchRow?: number | string
  device?: string
  homepageVer?: number | string
  screen?: string | [number, number]
  seoInfo?: string
  ttExp?: string
  staticParams?: Partial<TopFeedStaticParams>
}

export interface TopFeedApplyOptions {
  phase?: 'current' | 'next'
  clickIndex?: number
}

function toInteger(value: unknown, fallback: number): number {
  const number = Number.parseInt(String(value), 10)
  return Number.isFinite(number) ? number : fallback
}

function toOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null)
    return undefined
  return String(value)
}

function compactObject<T extends Record<string, unknown>>(object: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null),
  ) as Partial<T>
}

function normalizeScreen(screen: string | [number, number]): string {
  if (Array.isArray(screen) && screen.length >= 2)
    return `${screen[0]}-${screen[1]}`
  return String(screen)
}

function randomDigits(random: () => number, length: number): string {
  let output = ''
  for (let index = 0; index < length; index += 1) {
    const min = index === 0 ? 1 : 0
    const digit = Math.floor(random() * (10 - min)) + min
    output += digit
  }
  return output
}

function dedupeTail(list: string[], limit: number): string[] {
  const seen = new Set<string>()
  const output: string[] = []

  for (let index = list.length - 1; index >= 0; index -= 1) {
    const value = list[index]
    if (!value || seen.has(value))
      continue

    seen.add(value)
    output.unshift(value)
    if (output.length >= limit)
      break
  }

  return output
}

function firstDefined(...values: unknown[]): unknown {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

function firstUsableId(...values: unknown[]): string | number | null {
  for (const value of values) {
    if (value === undefined || value === null || value === '')
      continue
    if (typeof value === 'number') {
      if (value > 0)
        return value
      continue
    }
    if (typeof value === 'string') {
      if (value.trim())
        return value
      continue
    }
    return String(value)
  }
  return null
}

function isAdItem(item: TopFeedItemLike): boolean {
  return Boolean(
    item?.goto === 'ad'
    || item?.card_goto === 'ad'
    || item?.ad_info
    || item?.business_info?.ad_info
    || item?.business_info?.is_ad
    || item?.cm
    || item?.creative_id,
  )
}

function readAdTokenPrimaryId(item: TopFeedItemLike): unknown {
  return firstDefined(
    item?.business_info?.src_id,
    item?.business_info?.source_id,
    item?.creative_id,
    item?.ad_info?.creative_id,
    item?.ad_info?.creativeId,
    item?.business_info?.creative_id,
    item?.business_info?.creativeId,
    item?.business_info?.linked_creative_id,
    item?.business_info?.ad_info?.creative_id,
    item?.business_info?.ad_info?.creativeId,
    item?.cm?.creative_id,
  )
}

function readTopFeedVideoId(item: TopFeedItemLike): string | number | null {
  return firstUsableId(
    item?.aid,
    item?.archive?.aid,
    item?.business_info?.archive?.aid,
    item?.business_info?.archive?.cid,
    item?.business_info?.archive?.bvid,
    item?.id,
    item?.archive?.bvid,
    item?.bvid,
    item?.business_info?.creative_id,
    item?.business_info?.creativeId,
  )
}

export function toTopFeedShowToken(item: TopFeedItemLike, { phase = 'current' }: { phase?: 'current' | 'next' } = {}): string | null {
  const videoId = readTopFeedVideoId(item)
  if (!videoId)
    return null

  const suffix = phase === 'next' ? '_n' : ''
  if (isAdItem(item)) {
    const primaryId = readAdTokenPrimaryId(item)
    return primaryId ? `ad${suffix}_${primaryId}_${videoId}` : `ad${suffix}_${videoId}`
  }

  return `av${suffix}_${videoId}`
}

export function toTopFeedClickToken(itemOrId: TopFeedItemLike | number | string): string | null {
  if (typeof itemOrId === 'string' && itemOrId.includes('_'))
    return itemOrId.replace(/^ad_n_/, 'ad_').replace(/^av_n_/, 'av_')

  const videoId = typeof itemOrId === 'object'
    ? firstDefined(itemOrId?.id, itemOrId?.aid, itemOrId?.archive?.aid)
    : itemOrId

  return videoId ? `av_${videoId}` : null
}

export function createTopFeedSession(options: TopFeedSessionOptions = {}) {
  const now = options.now ?? (() => Date.now())
  const random = options.random ?? Math.random
  const ps = String(options.ps ?? TOP_FEED_DEFAULT_STATIC_PARAMS.ps)
  const showListLimit = toInteger(options.showListLimit, 12)
  const clickListLimit = toInteger(options.clickListLimit, 3)
  const staticParams: TopFeedStaticParams = {
    ...TOP_FEED_DEFAULT_STATIC_PARAMS,
    ...compactObject({
      ...options.staticParams,
      web_location: toOptionalString(options.webLocation),
      fresh_type: toOptionalString(options.freshType),
      feed_version: toOptionalString(options.feedVersion),
      fetch_row: toOptionalString(options.fetchRow),
      device: toOptionalString(options.device),
      homepage_ver: toOptionalString(options.homepageVer),
      ps,
      screen: options.screen ? normalizeScreen(options.screen) : undefined,
      seo_info: toOptionalString(options.seoInfo),
      tt_exp: toOptionalString(options.ttExp),
    }),
  }

  const state: TopFeedSessionState = {
    uniqId: String(options.uniqId ?? randomDigits(random, 12)),
    requestCount: toInteger(options.requestCount, 0),
    requestCount1h: toInteger(options.requestCount1h, 0),
    brushCount: toInteger(options.brushCount, 0),
    seenCount: toInteger(options.seenCount, 0),
    hourWindowStartedAt: toInteger(options.hourWindowStartedAt, now()),
    lastShowlistTokens: dedupeTail(options.lastShowlistTokens ?? [], showListLimit),
    lastClickTokens: dedupeTail(options.lastClickTokens ?? [], clickListLimit),
  }
  // Keep y_num tied to real user interactions instead of synthetic page-size increments.
  const clickedTokenSet = new Set<string>(state.lastClickTokens)

  function refreshHourWindow() {
    if (now() - state.hourWindowStartedAt >= 60 * 60 * 1000) {
      state.hourWindowStartedAt = now()
      state.requestCount1h = 0
    }
  }

  function getCurrentParams(overrides: Record<string, string> = {}): Record<string, string> {
    refreshHourWindow()
    return compactObject({
      ...staticParams,
      y_num: String(state.seenCount),
      last_y_num: String(state.seenCount),
      fresh_idx: String(state.requestCount + 1),
      fresh_idx_1h: String(state.requestCount1h + 1),
      brush: String(state.brushCount),
      last_showlist: state.lastShowlistTokens.join(','),
      last_clicklist: state.lastClickTokens.join(','),
      uniq_id: state.uniqId,
      ...overrides,
    }) as Record<string, string>
  }

  function recordBrush() {
    state.brushCount += 1
    return state.brushCount
  }

  function recordClick(itemOrId: TopFeedItemLike | number | string): string | null {
    const token = toTopFeedClickToken(itemOrId)
    if (!token)
      return null

    if (!clickedTokenSet.has(token)) {
      clickedTokenSet.add(token)
      state.seenCount += 1
    }
    state.lastClickTokens = dedupeTail([...state.lastClickTokens, token], clickListLimit)
    return token
  }

  function clearClickFeedback() {
    state.lastClickTokens = []
    state.seenCount = 0
    clickedTokenSet.clear()
  }

  function applyResponse(payload: TopFeedPayloadLike, options: TopFeedApplyOptions = {}) {
    const items = payload?.data?.item
    if (!Array.isArray(items)) {
      return {
        items: [] as TopFeedItemLike[],
        showTokens: [] as string[],
      }
    }

    const phase = options.phase ?? (state.requestCount === 0 ? 'current' : 'next')
    const showTokens = items
      .map(item => toTopFeedShowToken(item, { phase }))
      .filter((token): token is string => Boolean(token))

    state.lastShowlistTokens = dedupeTail([...state.lastShowlistTokens, ...showTokens], showListLimit)
    state.requestCount += 1
    state.requestCount1h += 1

    if (options.clickIndex !== undefined && items[options.clickIndex])
      recordClick(items[options.clickIndex])

    return {
      items,
      showTokens,
      nextParams: getCurrentParams(),
    }
  }

  function getState() {
    return {
      ...state,
      staticParams: { ...staticParams },
      lastShowlist: state.lastShowlistTokens.join(','),
      lastClicklist: state.lastClickTokens.join(','),
    }
  }

  return {
    getCurrentParams,
    recordBrush,
    recordClick,
    clearClickFeedback,
    applyResponse,
    getState,
  }
}
