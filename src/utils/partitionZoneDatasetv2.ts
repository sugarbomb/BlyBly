import type { PartitionZoneDatasetItem } from './partitionZoneDataset'

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

interface PartitionZoneV2ManualItem {
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
 * 备用分区数据（V2）：
 * 1. `zoneId` 填接口使用的分区 ID（rid）
 * 2. `name` 填分区名称
 * 3. `href` 填对应链接
 */
export const PARTITION_ZONE_V2_MANUAL_ITEMS: PartitionZoneV2ManualItem[] = [
  { iconFile: 'animal', zoneId: '1024', name: '动物圈', href: '/c/animal' },
  { iconFile: 'car', zoneId: '1013', name: '汽车', href: '/c/car' },
  { iconFile: 'cinephile', zoneId: '1001', name: '影视', href: '/c/cinephile' },
  { iconFile: 'dance', zoneId: '1004', name: '舞蹈', href: '/c/dance' },
  { iconFile: 'douga', zoneId: '1005', name: '动画', href: '/c/douga' },
  { iconFile: 'emotion', zoneId: '1027', name: '情感', href: '/c/emotion/' },
  { iconFile: 'entertainment', zoneId: '1002', name: '娱乐', href: '/c/ent' },
  { iconFile: 'fashion', zoneId: '1014', name: '时尚', href: '/c/fashion' },
  { iconFile: 'food', zoneId: '1020', name: '美食', href: '/c/food' },
  { iconFile: 'game', zoneId: '1008', name: '游戏', href: '/c/game' },
  { iconFile: 'gym', zoneId: '1017', name: '健身', href: '/c/gym/' },
  { iconFile: 'handmake', zoneId: '1019', name: '手工', href: '/c/handmake/' },
  { iconFile: 'health', zoneId: '1026', name: '健康', href: '/c/health/' },
  { iconFile: 'home', zoneId: '1015', name: '家居房产', href: '/c/home/' },
  { iconFile: 'information', zoneId: '1009', name: '资讯', href: '/c/information' },
  { iconFile: 'kichiku', zoneId: '1007', name: '鬼畜', href: '/c/kichiku' },
  { iconFile: 'knowledge', zoneId: '1010', name: '知识', href: '/c/knowledge' },
  { iconFile: 'life_experience', zoneId: '1031', name: '生活经验', href: '/c/life_experience/' },
  { iconFile: 'life_joy', zoneId: '1030', name: '生活兴趣', href: '/c/life_joy/' },
  { iconFile: 'music', zoneId: '1003', name: '音乐', href: '/c/music' },
  { iconFile: 'outdoors', zoneId: '1016', name: '户外潮流', href: '/c/outdoors/' },
  { iconFile: 'painting', zoneId: '1006', name: '绘画', href: '/c/painting/' },
  { iconFile: 'parenting', zoneId: '1025', name: '亲子', href: '/c/parenting/' },
  { iconFile: 'rural', zoneId: '1023', name: '三农', href: '/c/rural/' },
  { iconFile: 'shortplay', zoneId: '1021', name: '小剧场', href: '/c/shortplay/' },
  { iconFile: 'sports', zoneId: '1018', name: '运动', href: '/c/sports' },
  { iconFile: 'tech', zoneId: '1012', name: '科技', href: '/c/tech' },
  { iconFile: 'travel', zoneId: '1022', name: '出行', href: '/c/travel/' },
  { iconFile: 'vlog', zoneId: '1029', name: 'vlog', href: '/c/vlog/' },
  { iconFile: 'ai', zoneId: '1011', name: '人工智能', href: '/c/ai/' },
]

export const PARTITION_ZONE_DATASET_V2: PartitionZoneDatasetItem[] = PARTITION_ZONE_V2_MANUAL_ITEMS.map(item => ({
  zoneId: item.zoneId,
  name: item.name,
  href: item.href,
  icon: resolveAssetURL(`/assets/zone_v2_icon/${item.iconFile}.svg`),
}))
