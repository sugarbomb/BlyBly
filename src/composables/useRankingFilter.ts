import { useStorage } from '@vueuse/core'
import type { List as RankingVideoItem } from '~/models/video/ranking'
import type { List as RankingPgcItem } from '~/models/video/rankingPgc'

export interface FilterRule {
  id: string
  type: 'title' | 'username' | 'uid'
  value: string
  enabled: boolean
}

export interface RankingFilterOptions {
  enabled: boolean
  rules: FilterRule[]
  mode: 'blacklist' | 'whitelist'
}

const defaultOptions: RankingFilterOptions = {
  enabled: false,
  rules: [],
  mode: 'blacklist',
}

export function useRankingFilter() {
  const options = useStorage<RankingFilterOptions>(
    'bewlybewly-ranking-filter',
    defaultOptions,
    localStorage,
    { mergeDefaults: true }
  )

  /**
   * 添加过滤规则
   */
  const addRule = (rule: Omit<FilterRule, 'id'>) => {
    const id = `rule_${Date.now()}`
    options.value.rules.push({
      id,
      ...rule,
      enabled: true,
    })
  }

  /**
   * 删除过滤规则
   */
  const removeRule = (id: string) => {
    const index = options.value.rules.findIndex((rule: FilterRule) => rule.id === id)
    if (index !== -1)
      options.value.rules.splice(index, 1)
  }

  /**
   * 更新过滤规则
   */
  const updateRule = (id: string, updates: Partial<Omit<FilterRule, 'id'>>) => {
    const rule = options.value.rules.find((rule: FilterRule) => rule.id === id)
    if (rule) {
      Object.assign(rule, updates)
    }
  }

  /**
   * 切换过滤规则启用状态
   */
  const toggleRule = (id: string) => {
    const rule = options.value.rules.find((rule: FilterRule) => rule.id === id)
    if (rule) {
      rule.enabled = !rule.enabled
    }
  }

  /**
   * 切换过滤模式
   */
  const toggleFilterMode = () => {
    options.value.mode = options.value.mode === 'blacklist' ? 'whitelist' : 'blacklist'
  }

  /**
   * 检查视频是否匹配规则
   */
  const matchesRules = (video: RankingVideoItem): boolean => {
    // 只考虑启用的规则
    const activeRules = options.value.rules.filter((rule: FilterRule) => rule.enabled)
    
    if (activeRules.length === 0)
      return false
    
    return activeRules.some((rule: FilterRule) => {
      if (rule.type === 'title' && video.title) {
        return video.title.toLowerCase().includes(rule.value.toLowerCase())
      }
      else if (rule.type === 'username' && video.owner?.name) {
        return video.owner.name.toLowerCase().includes(rule.value.toLowerCase())
      }
      else if (rule.type === 'uid' && video.owner?.mid) {
        return video.owner.mid.toString() === rule.value
      }
      return false
    })
  }

  /**
   * 检查PGC内容是否匹配规则
   */
  const matchesPgcRules = (pgc: RankingPgcItem): boolean => {
    // 只考虑启用的规则
    const activeRules = options.value.rules.filter((rule: FilterRule) => rule.enabled)
    
    if (activeRules.length === 0)
      return false
    
    return activeRules.some((rule: FilterRule) => {
      if (rule.type === 'title' && pgc.title) {
        return pgc.title.toLowerCase().includes(rule.value.toLowerCase())
      }
      // PGC内容没有明确的用户名和UID，所以只过滤标题
      return false
    })
  }

  /**
   * 过滤视频列表
   */
  const filterVideos = (videos: RankingVideoItem[]): RankingVideoItem[] => {
    if (!options.value.enabled || options.value.rules.length === 0)
      return videos
    
    return videos.filter((video) => {
      const matches = matchesRules(video)
      return options.value.mode === 'blacklist' ? !matches : matches
    })
  }

  /**
   * 过滤PGC内容列表
   */
  const filterPgcList = (pgcList: RankingPgcItem[]): RankingPgcItem[] => {
    if (!options.value.enabled || options.value.rules.length === 0)
      return pgcList
    
    return pgcList.filter((pgc) => {
      const matches = matchesPgcRules(pgc)
      return options.value.mode === 'blacklist' ? !matches : matches
    })
  }

  return {
    options,
    addRule,
    removeRule,
    updateRule,
    toggleRule,
    toggleFilterMode,
    filterVideos,
    filterPgcList,
  }
} 