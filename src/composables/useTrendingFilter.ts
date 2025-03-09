// src/composables/useTrendingFilter.ts
import { ref, computed } from 'vue'
import { useStorageLocal } from './useStorageLocal'
import type { List as VideoItem } from '~/models/video/trending'

// 定义屏蔽规则类型
export interface BlockRule {
  id: string        // 规则唯一标识
  type: 'user' | 'title'  // 规则类型
  value: string     // 规则值
  enabled: boolean  // 是否启用
  remark?: string   // 备注说明
}

export function useTrendingFilter() {
  // 使用 storage 存储屏蔽规则
  const blockRules = useStorageLocal<BlockRule[]>('trendingBlockRules', [])
  
  // 添加屏蔽规则
  const addBlockRule = (type: 'user' | 'title', value: string, remark?: string) => {
    const newRule: BlockRule = {
      id: `rule_${Date.now()}`,
      type,
      value: value.trim(),
      enabled: true,
      remark
    }
    blockRules.value = [...blockRules.value, newRule]
  }

  // 移除屏蔽规则
  const removeBlockRule = (ruleId: string) => {
    blockRules.value = blockRules.value.filter(rule => rule.id !== ruleId)
  }

  // 切换规则启用状态
  const toggleRuleStatus = (ruleId: string) => {
    blockRules.value = blockRules.value.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    )
  }

  // 过滤视频列表
  const filterTrendingVideos = (videos: VideoItem[]) => {
    return videos.filter(video => {
      // 检查每个启用的规则
      return !blockRules.value
        .filter(rule => rule.enabled)
        .some(rule => {
          if (rule.type === 'user') {
            // 匹配UP主名称或ID
            return video.owner.name.includes(rule.value) || 
                   video.owner.mid.toString() === rule.value
          } else if (rule.type === 'title') {
            // 匹配视频标题
            return video.title.includes(rule.value)
          }
          return false
        })
    })
  }

  return {
    blockRules,
    addBlockRule,
    removeBlockRule,
    toggleRuleStatus,
    filterTrendingVideos
  }
}