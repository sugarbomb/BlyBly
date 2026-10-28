import type { APIMAP } from '../../utils'
import { AHS } from '../../utils'

const API_BANNER = {
  getHomeBanner: {
    url: 'https://api.bilibili.com/x/web-show/page/header',
    _fetch: {
      method: 'get',
    },
    params: {
      resource_id: 145,
    },
    afterHandle: AHS.J_D,
  },
} satisfies APIMAP

export default API_BANNER
