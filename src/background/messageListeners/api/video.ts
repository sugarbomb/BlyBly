import browser from 'webextension-polyfill'

import { md5Hex } from '~/utils/md5'
import { DEFAULT_TOP_FEED_PATH, TOP_FEED_DEFAULT_STATIC_PARAMS } from '~/utils/topFeedSession'

import type { APIMAP, Message } from '../../utils'
import { AHS } from '../../utils'

const TOP_FEED_URL = `https://api.bilibili.com${DEFAULT_TOP_FEED_PATH}`
const WBI_NAV_URL = 'https://api.bilibili.com/x/web-interface/nav'
const WBI_PARAM_FILTER_REGEX = /[!'()*]/g
const TOP_FEED_PARAM_ORDER = [
  'web_location',
  'y_num',
  'fresh_type',
  'feed_version',
  'fresh_idx_1h',
  'fetch_row',
  'fresh_idx',
  'brush',
  'device',
  'homepage_ver',
  'ps',
  'last_y_num',
  'screen',
  'seo_info',
  'tt_exp',
  'last_showlist',
  'last_clicklist',
  'uniq_id',
] as const
const WBI_MIXIN_KEY_ENC_TAB = [
  46,
  47,
  18,
  2,
  53,
  8,
  23,
  32,
  15,
  50,
  10,
  31,
  58,
  3,
  45,
  35,
  27,
  43,
  5,
  49,
  33,
  9,
  42,
  19,
  29,
  28,
  14,
  39,
  12,
  38,
  41,
  13,
  37,
  48,
  7,
  16,
  24,
  55,
  40,
  61,
  26,
  17,
  0,
  1,
  60,
  51,
  30,
  4,
  22,
  25,
  54,
  21,
  56,
  59,
  6,
  63,
  57,
  62,
  11,
  36,
  20,
  34,
  44,
  52,
] as const

function extractWbiKey(url: string): string {
  const filename = url.slice(url.lastIndexOf('/') + 1)
  return filename.slice(0, filename.lastIndexOf('.'))
}

function getWbiMixinKey(imgKey: string, subKey: string): string {
  const raw = imgKey + subKey
  return WBI_MIXIN_KEY_ENC_TAB.map(index => raw[index]).join('').slice(0, 32)
}

function sanitizeWbiValue(value: unknown): string {
  return String(value).replace(WBI_PARAM_FILTER_REGEX, '')
}

function buildTopFeedParams(message: Message): Record<string, string> {
  const { contentScriptQuery, ...rest } = message
  const params = { ...TOP_FEED_DEFAULT_STATIC_PARAMS } as Record<string, string>

  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined || value === null)
      return
    params[key] = String(value)
  })

  return params
}

async function getFirefoxCookieHeader(sender?: browser.Runtime.MessageSender): Promise<string | undefined> {
  // eslint-disable-next-line node/prefer-global/process
  if (!process.env.FIREFOX || !sender?.tab?.cookieStoreId)
    return undefined

  const cookies = await browser.cookies.getAll({ storeId: sender.tab.cookieStoreId })
  if (!cookies.length)
    return undefined

  return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
}

async function fetchWbiKeys(requestInit: RequestInit) {
  const response = await fetch(WBI_NAV_URL, requestInit)
  const payload = await response.json()
  const wbiImg = payload?.data?.wbi_img

  if (!wbiImg?.img_url || !wbiImg?.sub_url)
    throw new Error('Unable to read wbi_img keys from /x/web-interface/nav')

  return {
    imgKey: extractWbiKey(wbiImg.img_url),
    subKey: extractWbiKey(wbiImg.sub_url),
  }
}

function signWbiParams(params: Record<string, string>, imgKey: string, subKey: string): URLSearchParams {
  const sanitizedParams: Record<string, string> = {}
  const wts = String(Math.floor(Date.now() / 1000))

  Object.entries({ ...params, wts }).forEach(([key, value]) => {
    if (value === undefined || value === null)
      return
    sanitizedParams[key] = sanitizeWbiValue(value)
  })

  const sortedQuery = new URLSearchParams(sanitizedParams)
  sortedQuery.sort()

  const mixinKey = getWbiMixinKey(imgKey, subKey)
  const wRid = md5Hex(sortedQuery.toString() + mixinKey)
  const orderedQuery = new URLSearchParams()

  TOP_FEED_PARAM_ORDER.forEach((key) => {
    if (sanitizedParams[key] !== undefined)
      orderedQuery.set(key, sanitizedParams[key])
  })

  Object.keys(sanitizedParams)
    .filter(key => !TOP_FEED_PARAM_ORDER.includes(key as typeof TOP_FEED_PARAM_ORDER[number]) && key !== 'wts')
    .sort()
    .forEach((key) => {
      orderedQuery.set(key, sanitizedParams[key])
    })

  orderedQuery.set('w_rid', wRid)
  orderedQuery.set('wts', wts)

  return orderedQuery
}

async function requestTopFeed(message: Message, sender: browser.Runtime.MessageSender | undefined, withCookie: boolean) {
  const params = buildTopFeedParams(message)
  const headers: Record<string, string> = {}

  if (withCookie) {
    const firefoxCookieHeader = await getFirefoxCookieHeader(sender)
    if (firefoxCookieHeader)
      headers['firefox-multi-account-cookie'] = firefoxCookieHeader
  }

  const requestInit: RequestInit = {
    method: 'GET',
    // eslint-disable-next-line node/prefer-global/process
    credentials: withCookie && !process.env.FIREFOX ? 'include' : 'omit',
    headers,
    referrer: 'https://www.bilibili.com/',
  }

  const { imgKey, subKey } = await fetchWbiKeys(requestInit)
  const signedQuery = signWbiParams(params, imgKey, subKey)
  const requestURL = new URL(TOP_FEED_URL)
  requestURL.search = signedQuery.toString()

  const response = await fetch(requestURL.toString(), requestInit)
  return response.json()
}

async function getRecommendVideosGuest(message: Message) {
  return requestTopFeed(message, undefined, false)
}

async function getRecommendVideosWeb(message: Message, sender?: browser.Runtime.MessageSender) {
  return requestTopFeed(message, sender, true)
}

const API_VIDEO = {
  getRecommendVideos: {
    url: 'https://api.bilibili.com/x/web-interface/index/top/feed/rcmd',
    _fetch: {
      method: 'get',
    },
    // Legacy entry (kept for compatibility): treat as guest-mode (no cookies).
    // Prefer using `getRecommendVideosGuest` / `getRecommendVideosWeb` explicitly.
    useCookie: false,
    params: {
      fresh_idx: 0,
      feed_version: 'V2',
      fresh_type: 4,
      ps: 30,
      plat: 1,
    },
    afterHandle: AHS.J_D,
  },
  // Guest-mode feed: never attach cookies.
  getRecommendVideosGuest,
  // Web-login feed: allow cookie attachment (Firefox multi-account mode will inject cookies).
  getRecommendVideosWeb,
  getAppRecommendVideos: {
    url: 'https://app.bilibili.com/x/v2/feed/index',
    _fetch: {
      method: 'get',
      credentials: 'omit',
    },
    // App API is access_key based; keep it isolated from web cookies.
    useCookie: false,
    params: {
      build: 74800100,
      device: 'pad',
      mobi_app: 'iphone',
      c_locate: 'CN',
      s_locale: 'zh-CN',
      idx: 0,
      appkey: '27eb53fc9058f8c3',
      access_key: '',
    },
    afterHandle: AHS.J_D,
  },
  // https://github.com/indefined/UserScripts/blob/master/bilibiliHome/bilibiliHome.API.md#%E6%8F%90%E4%BA%A4%E4%B8%8D%E5%96%9C%E6%AC%A2
  dislikeVideo: {
    url: 'https://app.bilibili.com/x/feed/dislike',
    _fetch: {
      method: 'get',
      credentials: 'omit',
    },
    // App API is access_key based; keep it isolated from web cookies.
    useCookie: false,
    params: {
      access_key: '',
      goto: '',
      id: 0,
      idx: '',
      reason_id: 1,
      device: '',
      mobi_app: '',
      build: 0,
      appkey: '',
      sign: '',
    },
    afterHandle: AHS.J_D,
  },
  // https://github.com/indefined/UserScripts/blob/master/bilibiliHome/bilibiliHome.API.md#%E6%92%A4%E9%94%80%E4%B8%8D%E5%96%9C%E6%AC%A2
  undoDislikeVideo: {
    url: 'https://app.bilibili.com/x/feed/dislike/cancel',
    _fetch: {
      method: 'get',
      credentials: 'omit',
    },
    // App API is access_key based; keep it isolated from web cookies.
    useCookie: false,
    params: {
      access_key: '',
      goto: '',
      id: 0,
      idx: 0,
      reason_id: 1,
      device: '',
      mobi_app: '',
      build: 0,
      sign: '',
      appkey: '',
    },
    afterHandle: AHS.J_D,
  },
  // https://socialsisteryi.github.io/bilibili-API-collect/docs/video/info.html#%E8%8E%B7%E5%8F%96%E8%A7%86%E9%A2%91%E8%AF%A6%E7%BB%86%E4%BF%A1%E6%81%AF-web%E7%AB%AF
  getVideoInfo: {
    url: 'https://api.bilibili.com/x/web-interface/view',
    _fetch: {
      method: 'get',
    },
    params: {
      aid: '',
      bvid: '',
    },
    afterHandle: AHS.J_D,
  },
  // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/list.md#%E8%8E%B7%E5%8F%96%E8%AF%84%E8%AE%BA%E5%8C%BA%E6%98%8E%E7%BB%86_%E7%BF%BB%E9%A1%B5%E5%8A%A0%E8%BD%BD
  getVideoComments: {
    url: 'https://api.bilibili.com/x/v2/reply',
    _fetch: {
      method: 'get',
    },
    params: {
      csrf: '',
      type: 1,
      oid: 0,
      sort: 0,
      nohot: 0,
      pn: 1,
      ps: 20,
    },
    afterHandle: AHS.J_D,
  },
  // https://github.com/SocialSisterYi/bilibili-API-collect/blob/def57d7a70ed1f39080069ba0f40648ce6ce2b90/docs/video_ranking/popular.md#%E8%8E%B7%E5%8F%96%E5%BD%93%E5%89%8D%E7%83%AD%E9%97%A8%E8%A7%86%E9%A2%91%E5%88%97%E8%A1%A8
  getPopularVideos: {
    url: 'https://api.bilibili.com/x/web-interface/popular',
    _fetch: {
      method: 'get',
    },
    params: {
      pn: 1,
      ps: 20,
    },
    afterHandle: AHS.J_D,
  },
  // https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#%E8%8E%B7%E5%8F%96%E8%A7%86%E9%A2%91%E6%B5%81%E5%9C%B0%E5%9D%80-web%E7%AB%AF
  getVideoPreview: {
    url: 'https://api.bilibili.com/x/player/wbi/playurl',
    _fetch: {
      method: 'get',
    },
    params: {
      qn: 32,
      fnver: 0,
      fnval: 1,
      bvid: '',
      cid: 0,
    },
    afterHandle: AHS.J_D,
  },
} satisfies APIMAP

export default API_VIDEO
