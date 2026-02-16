import type { APIMAP } from '../../utils'
import { AHS } from '../../utils'

const API_WEEKLY_RANKING = {
  // https://api.bilibili.com/x/web-interface/popular/series/
  getWeeklyRankingSeriesList: {
    url: 'https://api.bilibili.com/x/web-interface/popular/series/list',
    _fetch: {
      method: 'get',
      // eslint-disable-next-line node/prefer-global/process
      credentials: process.env.FIREFOX ? 'omit' : 'include',
    },
    afterHandle: AHS.J_D,
  },

  // https://api.bilibili.com/x/web-interface/popular/series/one?number=3
  getWeeklyRankingSeriesDetail: {
    url: 'https://api.bilibili.com/x/web-interface/popular/series/one',
    _fetch: {
      method: 'get',
      // eslint-disable-next-line node/prefer-global/process
      credentials: process.env.FIREFOX ? 'omit' : 'include',
    },
    params: {
      number: 1,
    },
    afterHandle: AHS.J_D,
  },
} satisfies APIMAP

export default API_WEEKLY_RANKING
