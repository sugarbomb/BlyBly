import browser from 'webextension-polyfill'

import { md5Hex } from '~/utils/md5'

import type { APIMAP, Message } from '../../utils'
import { AHS } from '../../utils'

const PARTITION_FOR_YOU_URL = 'https://api.bilibili.com/x/web-interface/region/feed/rcmd'
const WBI_NAV_URL = 'https://api.bilibili.com/x/web-interface/nav'
const WBI_PARAM_FILTER_REGEX = /[!'()*]/g
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
const PARTITION_FOR_YOU_DEFAULT_PARAMS = {
  display_id: '1',
  request_cnt: '15',
  from_region: '1005',
  device: 'web',
  plat: '30',
  web_location: '333.40138',
} as const

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

function buildPartitionForYouParams(message: Message): Record<string, string> {
  const { contentScriptQuery, ...rest } = message
  const params = { ...PARTITION_FOR_YOU_DEFAULT_PARAMS } as Record<string, string>

  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '')
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
  const query = new URLSearchParams()
  const wts = String(Math.floor(Date.now() / 1000))

  Object.entries({ ...params, wts }).forEach(([key, value]) => {
    if (value === undefined || value === null)
      return
    query.set(key, sanitizeWbiValue(value))
  })

  query.sort()

  const mixinKey = getWbiMixinKey(imgKey, subKey)
  const wRid = md5Hex(query.toString() + mixinKey)
  query.set('w_rid', wRid)

  return query
}

async function getPartitionForYouList(message: Message, sender?: browser.Runtime.MessageSender) {
  const params = buildPartitionForYouParams(message)
  const headers: Record<string, string> = {}
  const firefoxCookieHeader = await getFirefoxCookieHeader(sender)

  if (firefoxCookieHeader)
    headers['firefox-multi-account-cookie'] = firefoxCookieHeader

  const requestInit: RequestInit = {
    method: 'GET',
    // eslint-disable-next-line node/prefer-global/process
    credentials: process.env.FIREFOX ? 'omit' : 'include',
    headers,
    referrer: 'https://www.bilibili.com/',
  }

  const { imgKey, subKey } = await fetchWbiKeys(requestInit)
  const signedQuery = signWbiParams(params, imgKey, subKey)
  const requestURL = new URL(PARTITION_FOR_YOU_URL)
  requestURL.search = signedQuery.toString()

  const response = await fetch(requestURL.toString(), requestInit)
  return response.json()
}

const API_PARTITION = {
  // Hot rank endpoint (kept for compatibility)
  getPartitionHotRankList: {
    url: 'https://api.bilibili.com/x/web-interface/newlist_rank',
    _fetch: {
      method: 'get',
    },
    params: {
      search_type: 'video',
      view_type: 'hot_rank',
      order: 'click',
      cate_id: 231,
      page: 1,
      pagesize: 2,
      time_from: '20240716',
      time_to: '20240723',
    },
    afterHandle: AHS.J_D,
  },

  // https://api.bilibili.com/x/web-interface/dynamic/region
  getPartitionRealtimeList: {
    url: 'https://api.bilibili.com/x/web-interface/dynamic/region',
    _fetch: {
      method: 'get',
      credentials: 'omit',
    },
    useCookie: false,
    params: {
      pn: 1,
      ps: 10,
      rid: 231,
    },
    afterHandle: AHS.J_D,
  },

  // https://api.bilibili.com/x/web-interface/region/feed/rcmd
  getPartitionForYouList,
} satisfies APIMAP

export default API_PARTITION
