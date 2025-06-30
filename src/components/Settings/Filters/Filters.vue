<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import Select from '~/components/Select.vue'
import { type FilterRule, useRankingFilter } from '~/composables/useRankingFilter'

import { BlockRulesSettings } from '../index'

const { t } = useI18n()
const { options, addRule, removeRule, toggleRule } = useRankingFilter()

const newRule = ref<Omit<FilterRule, 'id'>>({
  type: 'title',
  value: '',
  enabled: true,
})

const filterTypes = computed(() => [
  { value: 'title', label: t('settings.filters.rankingFilter.ruleTypes.title') },
  { value: 'username', label: t('settings.filters.rankingFilter.ruleTypes.username') },
  { value: 'uid', label: t('settings.filters.rankingFilter.ruleTypes.uid') },
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
  <div class="filters-settings">
    <div class="section-title text-lg font-medium mb-4">
      {{ t('settings.filters.title') }}
    </div>

    <!-- 内容过滤设置 -->
    <div class="section mb-8">
      <div class="section-header mb-4">
        <h2 class="text-xl font-semibold mb-2">
          {{ t('settings.filters.contentFilter.title') }}
        </h2>
        <p class="text-sm text-$bew-text-2">
          {{ t('settings.filters.contentFilter.description') }}
        </p>
      </div>

      <!-- 热门内容过滤设置 -->
      <div class="subsection mb-6 p-4 rounded bg-$bew-fill-1 border border-$bew-border-color shadow-sm">
        <div class="section-header mb-2">
          <h3 class="text-base font-medium">
            {{ t('settings.filters.contentFilter.trending') }}
          </h3>
          <p class="text-sm text-$bew-text-2">
            {{ t('settings.filters.contentFilter.trendingDesc') }}
          </p>
        </div>
        <!-- 屏蔽规则设置 -->
        <BlockRulesSettings />
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="border-b border-$bew-border-color mb-8" />

    <!-- 排行榜过滤设置 -->
    <div class="section mb-6">
      <div class="section-header mb-4">
        <h2 class="text-xl font-semibold mb-2">
          {{ t('settings.filters.rankingFilter.title') }}
        </h2>
        <p class="text-sm text-$bew-text-2">
          {{ t('settings.filters.rankingFilter.description') }}
        </p>
      </div>

      <!-- 启用开关 -->
      <div class="subsection mb-6">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-base font-medium">
              {{ t('settings.filters.rankingFilter.enable') }}
            </div>
            <div class="text-sm text-$bew-text-2">
              {{ t('settings.filters.rankingFilter.enableDesc') }}
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
      <div class="subsection mb-6">
        <div class="section-header mb-2">
          <h3 class="text-base font-medium">
            {{ t('settings.filters.rankingFilter.filterMode') }}
          </h3>
          <p class="text-sm text-$bew-text-2">
            {{ t('settings.filters.rankingFilter.filterModeDesc') }}
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
              <label for="blacklist">{{ t('settings.filters.rankingFilter.modes.blacklist') }}</label>
            </div>
            <div class="flex items-center gap-2">
              <input
                id="whitelist"
                v-model="options.mode"
                type="radio"
                value="whitelist"
                name="filterMode"
              >
              <label for="whitelist">{{ t('settings.filters.rankingFilter.modes.whitelist') }}</label>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加规则 -->
      <div class="subsection mb-6">
        <div class="section-header mb-2">
          <h3 class="text-base font-medium">
            {{ t('settings.filters.rankingFilter.addRule') }}
          </h3>
          <p class="text-sm text-$bew-text-2">
            {{ t('settings.filters.rankingFilter.addRuleDesc') }}
          </p>
        </div>
        <div class="flex gap-2 items-end">
          <div class="w-1/4">
            <Select
              v-model="newRule.type"
              :options="filterTypes"
              class="w-full"
            />
          </div>
          <div class="flex-1">
            <input
              v-model="newRule.value"
              :placeholder="t('settings.filters.rankingFilter.inputValue')"
              class="w-full p-2 rounded bg-$bew-fill-1 border border-$bew-border-color"
              @keyup.enter="handleAddRule"
            >
          </div>
          <button
            :disabled="!isValidRule"
            class="px-4 py-2 rounded bg-$bew-theme-color text-white disabled:opacity-50"
            @click="handleAddRule"
          >
            {{ t('settings.filters.rankingFilter.add') }}
          </button>
        </div>
      </div>

      <!-- 规则列表 -->
      <div class="subsection mb-6">
        <div class="section-header mb-2">
          <h3 class="text-base font-medium">
            {{ t('settings.filters.rankingFilter.ruleList') }}
          </h3>
          <p class="text-sm text-$bew-text-2">
            {{ t('settings.filters.rankingFilter.ruleListDesc') }}
          </p>
        </div>

        <div v-if="options.rules.length === 0" class="text-center py-4 text-$bew-text-2">
          {{ t('settings.filters.rankingFilter.noRules') }}
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
  </div>
</template>

<style lang="scss" scoped>
// 参考排行榜过滤设置的主题样式，完善热门过滤部分
.filters-settings .subsection {
  background: var(--bew-content) !important;
  border: 1px solid var(--bew-border-color) !important;
  border-radius: 12px !important;
  box-shadow: var(--bew-shadow-1);
  padding: 1.5rem !important;
}
.filters-settings .subsection .section-header h3 {
  color: var(--bew-text-1);
}
// 只针对表单元素设置背景，避免影响Select下拉菜单
.filters-settings .block-rules-settings input,
.filters-settings .block-rules-settings select,
.filters-settings .block-rules-settings textarea {
  background-color: var(--bew-fill-1) !important;
  color: var(--bew-text-1) !important;
  border: 1px solid var(--bew-border-color) !important;
  border-radius: 8px !important;
  padding: 0.5rem 0.75rem !important;
  font-size: 1rem;
}
.filters-settings .block-rules-settings button {
  background: var(--bew-theme-color) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.5rem 1.25rem !important;
  font-size: 1rem;
  transition: background 0.2s;
}
.filters-settings .block-rules-settings button:hover:not(:disabled) {
  background: var(--bew-theme-color-80) !important;
}
.filters-settings .block-rules-settings button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.filters-settings .block-rules-settings .text-red-500 {
  color: hsl(358 75% 59%) !important;
}
.filters-settings .block-rules-settings .text-red-500:hover {
  color: hsl(358 75% 70%) !important;
}
.filters-settings .block-rules-settings .flex.items-center.justify-between.p-2 {
  background: var(--bew-content) !important;
  border: 1px solid var(--bew-border-color) !important;
  color: var(--bew-text-1) !important;
  border-radius: 8px !important;
}
.filters-settings .block-rules-settings .text-center.text-gray-500.py-4 {
  color: var(--bew-text-3) !important;
  background: var(--bew-content) !important;
  border-radius: 8px !important;
}
// 统一两个过滤板块的列表区域样式
.filters-settings .subsection .space-y-2 > .flex.items-center.justify-between {
  background: var(--bew-content) !important;
  border: 1px solid var(--bew-border-color) !important;
  border-radius: 8px !important;
  color: var(--bew-text-1) !important;
  gap: 0.5rem;
  padding: 0.5rem 1rem !important;
  align-items: center;
}
.filters-settings .subsection .space-y-2 > .flex.items-center.justify-between .flex.items-center.gap-2 {
  gap: 0.5rem;
  align-items: center;
}
.filters-settings .subsection .space-y-2 > .flex.items-center.justify-between .px-2.py-1.text-xs.rounded.border {
  min-width: 40px;
  text-align: center;
  display: inline-block;
}
.filters-settings .subsection .space-y-2 > .flex.items-center.justify-between button {
  padding: 0.25rem 0.5rem !important;
  border-radius: 6px !important;
  background: none;
  color: var(--bew-text-1);
  transition: background 0.2s;
}
.filters-settings .subsection .space-y-2 > .flex.items-center.justify-between button:hover {
  background: var(--bew-fill-2) !important;
}
</style>
