<script setup lang="ts">
import { computed, ref } from 'vue'

import { type FilterRule, useRankingFilter } from '~/composables/useRankingFilter'

const { options, addRule, removeRule, toggleRule } = useRankingFilter()

const newRule = ref<Omit<FilterRule, 'id'>>({
  type: 'title',
  value: '',
  enabled: true,
})

const filterTypes = computed(() => [
  { value: 'title', label: '标题' },
  { value: 'username', label: '用户名' },
  { value: 'uid', label: 'UID' },
])

const isValidRule = computed(() => {
  return newRule.value.value.trim() !== ''
})

function handleAddRule() {
  if (isValidRule.value) {
    addRule({
      type: newRule.value.type,
      value: newRule.value.value.trim(),
      enabled: true,
    })
    // 重置表单
    newRule.value.value = ''
  }
}

function handleRemoveRule(id: string) {
  removeRule(id)
}

function handleToggleRule(id: string) {
  toggleRule(id)
}
</script>

<template>
  <div class="ranking-filter-settings">
    <div class="section-title text-lg font-medium mb-4">
      排行榜过滤设置
    </div>

    <!-- 启用开关 -->
    <div class="section mb-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-base font-medium">
            启用排行榜过滤
          </div>
          <div class="text-sm text-$bew-text-2">
            开启后可对排行榜内容进行过滤
          </div>
        </div>
        <div>
          <input
            v-model="options.enabled"
            type="checkbox"
            class="toggle"
          >
        </div>
      </div>
    </div>

    <!-- 过滤模式 -->
    <div class="section mb-6">
      <div class="section-header mb-2">
        <h3 class="text-base font-medium">
          过滤模式
        </h3>
        <p class="text-sm text-$bew-text-2">
          黑名单模式：屏蔽命中规则的内容；白名单模式：仅显示命中规则的内容
        </p>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex gap-4">
          <div class="flex items-center gap-2">
            <input
              id="blacklist"
              v-model="options.mode"
              type="radio"
              value="blacklist"
              name="filterMode"
            >
            <label for="blacklist">黑名单</label>
          </div>
          <div class="flex items-center gap-2">
            <input
              id="whitelist"
              v-model="options.mode"
              type="radio"
              value="whitelist"
              name="filterMode"
            >
            <label for="whitelist">白名单</label>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加规则 -->
    <div class="section mb-6">
      <div class="section-header mb-2">
        <h3 class="text-base font-medium">
          添加过滤规则
        </h3>
        <p class="text-sm text-$bew-text-2">
          可按标题、用户名或UID添加过滤规则
        </p>
      </div>
      <div class="flex gap-2 items-end">
        <div class="w-1/4">
          <select
            v-model="newRule.type"
            class="w-full p-2 rounded bg-$bew-fill-1 border border-$bew-border-color"
          >
            <option
              v-for="type in filterTypes"
              :key="type.value"
              :value="type.value"
            >
              {{ type.label }}
            </option>
          </select>
        </div>
        <div class="flex-1">
          <input
            v-model="newRule.value"
            placeholder="请输入过滤内容"
            class="w-full p-2 rounded bg-$bew-fill-1 border border-$bew-border-color"
            @keyup.enter="handleAddRule"
          >
        </div>
        <button
          :disabled="!isValidRule"
          class="px-4 py-2 rounded bg-$bew-theme-color text-white disabled:opacity-50"
          @click="handleAddRule"
        >
          添加
        </button>
      </div>
    </div>

    <!-- 规则列表 -->
    <div class="section mb-6">
      <div class="section-header mb-2">
        <h3 class="text-base font-medium">
          过滤规则列表
        </h3>
        <p class="text-sm text-$bew-text-2">
          可随时启用/禁用或删除规则
        </p>
      </div>

      <div v-if="options.rules.length === 0" class="text-center py-4 text-$bew-text-2">
        暂无过滤规则
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="rule in options.rules"
          :key="rule.id"
          class="flex items-center justify-between p-2 rounded bg-$bew-fill-1"
        >
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              :checked="rule.enabled"
              @change="handleToggleRule(rule.id)"
            >
            <div>
              <span class="px-2 py-1 text-xs rounded border border-$bew-border-color">
                {{ filterTypes.find(t => t.value === rule.type)?.label }}
              </span>
              <span class="ml-2">{{ rule.value }}</span>
            </div>
          </div>
          <button
            class="p-1 rounded hover:bg-$bew-fill-2"
            @click="handleRemoveRule(rule.id)"
          >
            <i class="i-mingcute:delete-line" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
