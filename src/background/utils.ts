// 对于fetch的常见后处理
// 1. 直接返回data
// 2. json化后返回data

import type Browser from 'webextension-polyfill'

type SendResponse = (response?: any) => void
type FetchAfterHandler = (data: any) => any | Promise<any>
type AfterHandleStep = FetchAfterHandler | typeof sendResponseHandler

function toJsonHandler(data: Response): Promise<any> {
  return data.json()
}
function toData<T>(data: T): T {
  return data
}

// if need sendResponse, use this
// return a FetchAfterHandler function
function sendResponseHandler(sendResponse: SendResponse) {
  return (data: any) => sendResponse(data)
}

// 定义后处理流
const AHS: {
  J_D: FetchAfterHandler[]
  J_S: FetchAfterHandler[]
  S: FetchAfterHandler[]
} = {
  J_D: [toJsonHandler, toData],
  J_S: [toJsonHandler, sendResponseHandler],
  S: [sendResponseHandler],
}

interface Message {
  contentScriptQuery: string
  [key: string]: any
}

interface _FETCH {
  method: string
  credentials?: 'omit' | 'include' | 'same-origin'
  headers?: {
    [key: string]: any
  }
  body?: any
}

interface API {
  url: string
  _fetch: _FETCH
  params?: {
    [key: string]: any
  }
  /**
   * Whether to include browser cookies when available (Firefox multi-account mode).
   * Default: true (keep existing behavior).
   *
   * Set to false for "guest mode" requests to avoid accidentally mixing with web-login behavior.
   */
  useCookie?: boolean
  afterHandle: AfterHandleStep[]
}
// 重载API 可以为函数
type APIFunction = (message: Message, sender?: any, sendResponse?: SendResponse) => any
export type APIType = API | APIFunction
interface APIMAP {
  [key: string]: APIType
}
// 工厂函数API_LISTENER_FACTORY
function apiListenerFactory(API_MAP: APIMAP) {
  return async (message: Message, sender?: Browser.Runtime.MessageSender, sendResponse?: SendResponse) => {
    const contentScriptQuery = message.contentScriptQuery
    // 检测是否有contentScriptQuery
    if (!contentScriptQuery || !API_MAP[contentScriptQuery])
      return console.error(`Cannot find this contentScriptQuery: ${contentScriptQuery}`)
    if (API_MAP[contentScriptQuery] instanceof Function)
      return (API_MAP[contentScriptQuery] as APIFunction)(message, sender, sendResponse)

    const api = API_MAP[contentScriptQuery] as API

    // eslint-disable-next-line node/prefer-global/process
    if (process.env.FIREFOX && api.useCookie !== false && sender && sender.tab && sender.tab.cookieStoreId) {
      const cookies = await browser.cookies.getAll({ storeId: sender.tab.cookieStoreId })
      return doRequest(message, api, sendResponse, cookies)
    }

    return doRequest(message, api, sendResponse)
  }
}

function doRequest(message: Message, api: API, sendResponse?: SendResponse, cookies?: Browser.Cookies.Cookie[]) {
  try {
    let { contentScriptQuery, ...rest } = message
    // rest above two part body or params
    rest = rest || {}

    let { _fetch, url, params = {}, afterHandle } = api
    const { method, headers = {}, body, credentials } = _fetch as _FETCH
    const isGET = method.toLocaleLowerCase() === 'get'
    // merge params and body
    const targetParams = Object.assign({}, params)
    let targetBody = Object.assign({}, body)
    Object.keys(rest).forEach((key) => {
      if (body && body[key] !== undefined)
        targetBody[key] = rest[key]
      else
        targetParams[key] = rest[key]
    })

    // generate params
    if (Object.keys(targetParams).length) {
      const urlParams = new URLSearchParams()
      for (const key in targetParams) {
        if (targetParams[key])
          urlParams.append(key, String(targetParams[key]))
      }
      url += `?${urlParams.toString()}`
    }
    // generate body
    if (!isGET) {
      targetBody = (headers && headers['Content-Type'] && headers['Content-Type'].includes('application/x-www-form-urlencoded'))
        ? new URLSearchParams(targetBody)
        : JSON.stringify(targetBody)
    }
    // generate cookies
    if (cookies) {
      const cookieStr = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
      headers['firefox-multi-account-cookie'] = cookieStr
    }
    // get cant take body
    const fetchOpt = { method, headers, credentials }
    if (!isGET)
      Object.assign(fetchOpt, { body: targetBody })
    // fetch and after handle
    let baseFunc: Promise<any> = fetch(url, {
      ...fetchOpt,
    })
    afterHandle.forEach((func) => {
      if (func === sendResponseHandler && sendResponse)
        // sendResponseHandler 是一个特殊的后处理函数，需要传入sendResponse
        baseFunc = baseFunc.then(sendResponseHandler(sendResponse))
      else
        baseFunc = baseFunc.then(func as FetchAfterHandler)
    })
    baseFunc.catch(console.error)
    return baseFunc
  }
  catch (e) {
    console.error(e)
  }
}

export {
  type _FETCH,
  AHS,
  type API,
  apiListenerFactory,
  type APIMAP,
  type FetchAfterHandler,
  type Message,
  sendResponseHandler,
  toData,
  toJsonHandler,
}
