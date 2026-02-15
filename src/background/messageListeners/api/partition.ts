import type { APIMAP } from '../../utils'
import { AHS } from '../../utils'

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
    },
    params: {
      pn: 1,
      ps: 14,
      rid: 231,
    },
    afterHandle: AHS.J_D,
  },

  // TODO: getPartitionForYou
} satisfies APIMAP

export default API_PARTITION
