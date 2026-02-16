export interface PartitionZoneDatasetItem {
  zoneId: string
  name: string
  href: string
  icon: string
}

type ZoneV2IconFileName =
  | 'ai'
  | 'animal'
  | 'car'
  | 'cinephile'
  | 'dance'
  | 'douga'
  | 'emotion'
  | 'entertainment'
  | 'fashion'
  | 'food'
  | 'game'
  | 'gym'
  | 'handmake'
  | 'health'
  | 'home'
  | 'information'
  | 'kichiku'
  | 'knowledge'
  | 'life_experience'
  | 'life_joy'
  | 'music'
  | 'outdoors'
  | 'painting'
  | 'parenting'
  | 'rural'
  | 'shortplay'
  | 'sports'
  | 'tech'
  | 'travel'
  | 'vlog'

interface PartitionZoneManualItem {
  iconFile: ZoneV2IconFileName
  zoneId: string
  name: string
  href: string
}

function resolveAssetURL(path: string): string {
  if (typeof browser !== 'undefined' && browser.runtime?.getURL)
    return browser.runtime.getURL(path)
  return path
}

/**
 * 手动导入位：
 * 1. `zoneId` 填分区 ID
 * 2. `name` 填分区名称
 * 3. `href` 填对应链接
 */
export const PARTITION_ZONE_MANUAL_ITEMS: PartitionZoneManualItem[] = [

  { iconFile: 'animal', zoneId: '217', name: '动物圈', href: '/v/animal' },
  { iconFile: 'car', zoneId: '223', name: '汽车', href: '/v/car' },
  { iconFile: 'cinephile', zoneId: '181', name: '影视', href: '/v/cinephile' },
  { iconFile: 'dance', zoneId: '129', name: '舞蹈', href: '/v/dance' },
  { iconFile: 'douga', zoneId: '1', name: '动画', href: '/v/douga' },
  { iconFile: 'emotion', zoneId: '', name: '情感', href: '' },
  { iconFile: 'entertainment', zoneId: '5', name: '娱乐', href: '/v/ent' },
  { iconFile: 'fashion', zoneId: '155', name: '时尚', href: '/v/fashion' },
  { iconFile: 'food', zoneId: '211', name: '美食', href: '/v/food' },
  { iconFile: 'game', zoneId: '4', name: '游戏', href: '/v/game' },
  { iconFile: 'gym', zoneId: '', name: '健身', href: '' },
  { iconFile: 'handmake', zoneId: '161', name: '手工', href: '/v/life/handmake' },
  { iconFile: 'health', zoneId: '', name: '健康', href: '' },
  { iconFile: 'home', zoneId: '239', name: '家居房产', href: '/v/life/home' },
  { iconFile: 'information', zoneId: '202', name: '资讯', href: '/v/information' },
  { iconFile: 'kichiku', zoneId: '119', name: '鬼畜', href: '/v/kichiku' },
  { iconFile: 'knowledge', zoneId: '36', name: '知识', href: '/v/knowledge' },
  { iconFile: 'life_experience', zoneId: '', name: '生活经验', href: '' },
  { iconFile: 'life_joy', zoneId: '', name: '生活兴趣', href: '' },
  { iconFile: 'music', zoneId: '3', name: '音乐', href: '/v/music' },
  { iconFile: 'outdoors', zoneId: '', name: '户外潮流', href: '' },
  { iconFile: 'painting', zoneId: '162', name: '绘画', href: '/v/life/painting' },
  { iconFile: 'parenting', zoneId: '254', name: '亲子', href: '/v/life/parenting' },
  { iconFile: 'rural', zoneId: '251', name: '三农', href: '/v/life/rurallife' },
  { iconFile: 'shortplay', zoneId: '85', name: '小剧场', href: '/v/cinephile/shortplay' },
  { iconFile: 'sports', zoneId: '234', name: '运动', href: '/v/sports' },
  { iconFile: 'tech', zoneId: '188', name: '科技', href: '/v/tech' },
  { iconFile: 'travel', zoneId: '250', name: '出行', href: '/v/life/travel' },
  { iconFile: 'vlog', zoneId: '', name: 'vlog', href: '' },
  { iconFile: 'ai', zoneId: '', name: '人工智能', href: '' },
]

export const PARTITION_ZONE_DATASET: PartitionZoneDatasetItem[] = PARTITION_ZONE_MANUAL_ITEMS.map(item => ({
  zoneId: item.zoneId,
  name: item.name,
  href: item.href,
  icon: resolveAssetURL(`/assets/zone_v2_icon/${item.iconFile}.svg`),
}))
