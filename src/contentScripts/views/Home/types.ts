import type { GridLayoutType } from '~/logic'

export enum HomeSubPage {
  ForYou = 'ForYou',
  PartitionForYou = 'PartitionForYou',
  PartitionRealtime = 'PartitionRealtime',
  Following = 'Following',
  SubscribedSeries = 'SubscribedSeries',
  Trending = 'Trending',
  Ranking = 'Ranking',
  WeeklyRanking = 'WeeklyRanking',
  Live = 'Live',
}

export type HomePageGroupId = 'rankTrending' | 'followLive' | 'subForYou' | 'partition'

export interface HomePageTabVisibilityItem {
  page: HomeSubPage
  visible: boolean
}

export interface HomePageGroup {
  id: HomePageGroupId
  items: HomePageTabVisibilityItem[]
}

export interface RankingType {
  id: number
  name: string
  rid?: number
  seasonType?: number
  type?: string
}

export interface GridLayoutIcon {
  icon: string
  iconActivated: string
  value: GridLayoutType
}
