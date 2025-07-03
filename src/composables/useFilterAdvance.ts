import { useStorage } from '@vueuse/core'

import type { List as RankingVideoItem } from '~/models/video/ranking'
import type { List as RankingPgcItem } from '~/models/video/rankingPgc'
import type { List as TrendingVideoItem } from '~/models/video/trending'

export interface FilterRule {
  id: string
  type: 'title' | 'username' | 'uid'
  value: string
  enabled: boolean
}

export interface FilterOptions {
  enabled: boolean
  rules: FilterRule[]
}

const defaultOptions: FilterOptions = {
  enabled: false,
  rules: [],
}

export function useFilterAdvance(storageKey: string = 'bewlybewly-filter-advance') {
  const options = useStorage<FilterOptions>(
    storageKey,
    defaultOptions,
    localStorage,
    { mergeDefaults: true },
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
   * 切换过滤器总开关
   */
  const toggleEnabled = () => {
    options.value.enabled = !options.value.enabled
  }

  /**
   * 导出当前规则到共享空间
   */
  const exportToSharedSpace = () => {
    const exportData = {
      type: 'bewlybewly-filter-rules',
      version: '1.0',
      timestamp: Date.now(),
      rules: options.value.rules.map(rule => ({
        type: rule.type,
        value: rule.value,
        enabled: rule.enabled,
      })),
    }
    localStorage.setItem('bewlybewly-filter-shared', JSON.stringify(exportData))
    return { success: true, count: options.value.rules.length }
  }

  /**
   * 从共享空间导入规则（追加模式）
   */
  const importFromSharedSpace = () => {
    try {
      const text = localStorage.getItem('bewlybewly-filter-shared')
      if (!text)
        return { success: false, error: '共享空间为空' }
      const importData = JSON.parse(text)
      if (importData.type !== 'bewlybewly-filter-rules' || !Array.isArray(importData.rules)) {
        return { success: false, error: '无效的数据格式' }
      }
      const validRules = importData.rules.filter((rule: any) => {
        return rule.type && ['title', 'username', 'uid'].includes(rule.type)
          && rule.value && typeof rule.value === 'string'
          && typeof rule.enabled === 'boolean'
      })
      if (validRules.length === 0) {
        return { success: false, error: '没有找到有效的规则' }
      }
      // 过滤重复 type+value
      const existingSet = new Set(options.value.rules.map(r => `${r.type}::${r.value}`))
      let added = 0
      validRules.forEach((rule: any) => {
        const key = `${rule.type}::${rule.value}`
        if (!existingSet.has(key)) {
          addRule({
            type: rule.type,
            value: rule.value,
            enabled: rule.enabled,
          })
          existingSet.add(key)
          added++
        }
      })
      return {
        success: true,
        imported: added,
        skipped: validRules.length - added,
      }
    }
    catch {
      return { success: false, error: '解析数据失败' }
    }
  }

  /**
   * 清空共享空间
   */
  const clearSharedSpace = () => {
    localStorage.removeItem('bewlybewly-filter-shared')
  }

  /**
   * 清空所有规则
   */
  const clearAllRules = () => {
    options.value.rules = []
  }

  /**
   * 检查视频是否匹配规则（返回 true 表示匹配，应该被过滤）
   */
  const matchesRules = (video: RankingVideoItem | TrendingVideoItem): boolean => {
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
   * 检查PGC内容是否匹配规则（返回 true 表示匹配，应该被过滤）
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
  const filterVideos = <T extends RankingVideoItem | TrendingVideoItem>(videos: T[]): T[] => {
    if (!options.value.enabled || options.value.rules.length === 0)
      return videos

    return videos.filter((video) => {
      const matches = matchesRules(video)
      return !matches // 移除匹配的视频（黑名单模式）
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
      return !matches // 移除匹配的PGC内容（黑名单模式）
    })
  }

  return {
    options,
    addRule,
    removeRule,
    updateRule,
    toggleRule,
    toggleEnabled,
    exportToSharedSpace,
    importFromSharedSpace,
    clearSharedSpace,
    clearAllRules,
    filterVideos,
    filterPgcList,
  }
}
