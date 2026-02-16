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
  { iconFile: 'animal', zoneId: '', name: '', href: '' },
  { iconFile: 'car', zoneId: '', name: '', href: '' },
  { iconFile: 'cinephile', zoneId: '', name: '', href: '' },
  { iconFile: 'dance', zoneId: '', name: '', href: '' },
  { iconFile: 'douga', zoneId: '', name: '', href: '' },
  { iconFile: 'emotion', zoneId: '', name: '', href: '' },
  { iconFile: 'entertainment', zoneId: '', name: '', href: '' },
  { iconFile: 'fashion', zoneId: '', name: '', href: '' },
  { iconFile: 'food', zoneId: '', name: '', href: '' },
  { iconFile: 'game', zoneId: '', name: '', href: '' },
  { iconFile: 'gym', zoneId: '', name: '', href: '' },
  { iconFile: 'handmake', zoneId: '', name: '', href: '' },
  { iconFile: 'health', zoneId: '', name: '', href: '' },
  { iconFile: 'home', zoneId: '', name: '', href: '' },
  { iconFile: 'information', zoneId: '', name: '', href: '' },
  { iconFile: 'kichiku', zoneId: '', name: '', href: '' },
  { iconFile: 'knowledge', zoneId: '', name: '', href: '' },
  { iconFile: 'life_experience', zoneId: '', name: '', href: '' },
  { iconFile: 'life_joy', zoneId: '', name: '', href: '' },
  { iconFile: 'music', zoneId: '', name: '', href: '' },
  { iconFile: 'outdoors', zoneId: '', name: '', href: '' },
  { iconFile: 'painting', zoneId: '', name: '', href: '' },
  { iconFile: 'parenting', zoneId: '', name: '', href: '' },
  { iconFile: 'rural', zoneId: '', name: '', href: '' },
  { iconFile: 'shortplay', zoneId: '', name: '', href: '' },
  { iconFile: 'sports', zoneId: '', name: '', href: '' },
  { iconFile: 'tech', zoneId: '', name: '', href: '' },
  { iconFile: 'travel', zoneId: '', name: '', href: '' },
  { iconFile: 'vlog', zoneId: '', name: '', href: '' },
  { iconFile: 'ai', zoneId: '', name: '', href: '' },
]

export const PARTITION_ZONE_DATASET_V2: PartitionZoneDatasetItem[] = PARTITION_ZONE_V2_MANUAL_ITEMS.map(item => ({
  zoneId: item.zoneId,
  name: item.name,
  href: item.href,
  icon: resolveAssetURL(`/assets/zone_v2_icon/${item.iconFile}.svg`),
}))
