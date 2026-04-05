import type { API_COLLECTION } from '~/background/messageListeners/api'
import type { Message } from '~/background/utils'

type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
  : Lowercase<S>

type MessagePayload<T> = T extends (message: infer M, ...args: any[]) => any
  ? M extends Message
    ? Omit<M, 'contentScriptQuery'>
    : never
  : never

type APICall<T> = T extends (...args: any[]) => any
  ? (options?: Partial<MessagePayload<T>>) => Promise<any>
  : T extends {
    _fetch: {
      method: infer M
      body?: infer B
    }
    params?: infer P
  }
    ? Lowercase<M & string> extends 'get'
      ? (options?: Partial<P>) => Promise<any>
      : (options?: Partial<P & B>) => Promise<any>
    : never

type APIFunction<T = typeof API_COLLECTION> = {
  [K in keyof T as CamelCase<string & K>]: {
    [P in keyof T[K]]: APICall<T[K][P]>
  }
}

// eslint-disable-next-line ts/no-unsafe-declaration-merging
export interface APIClient extends APIFunction<typeof API_COLLECTION> {

}

// eslint-disable-next-line ts/no-unsafe-declaration-merging
export class APIClient {
  private readonly cache = new Map<string | symbol, any>()

  constructor() {
    // @ts-expect-error ignore
    return new Proxy({}, {
      get: (_, namespace) => { // namespace
        if (this.cache.has(namespace)) {
          return this.cache.get(namespace)
        }
        else {
          const api = new Proxy({}, {
            get(_, p) {
              return (options?: object) => {
                return browser.runtime.sendMessage({
                  contentScriptQuery: p,
                  ...options,
                })
              }
            },
          })
          this.cache.set(namespace, api)
          return api
        }
      },
    })
  }
}

const api = new APIClient()

export default api
