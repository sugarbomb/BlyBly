<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'

import Select from '~/components/Select.vue'
import {
  FILTER_SCOPE_OPTIONS,
  type FilterRule,
  FilterScope,
  useFilterAdvance,
} from '~/composables/useFilterAdvance'

const toast = useToast()
const {
  addRule,
  removeRule,
  isScopeEnabled,
  setScopeEnabled,
  exportToSharedSpace,
  importFromSharedSpace,
  exportToFile,
  importFromFile,
  clearAllRules,
  organizeRules,
  getLegacyStatus,
  convertLegacyFilters,
  listRules,
} = useFilterAdvance(FilterScope.Global)

const DEFAULT_VISIBLE_RULE_LIMIT = 24

const selectedTime = ref<'permanent' | 'expiring'>('permanent')
const selectedScope = ref<FilterScope>(FilterScope.Global)
const searchKeyword = ref('')
const showValues = ref(false)
const showManualAdd = ref(false)
const visibleRuleLimit = ref(DEFAULT_VISIBLE_RULE_LIMIT)
const legacyStatus = ref(getLegacyStatus())
const newRuleType = ref<'keyword' | 'uid'>('keyword')
const newRuleValue = ref('')
const fileInputRef = ref<HTMLInputElement>()
const ruleInputRef = ref<HTMLInputElement>()

const timeOptions = [
  { value: 'permanent', label: '永久' },
  { value: 'expiring', label: '期限' },
]

const expiringScopeOptions = [
  { value: FilterScope.Global, label: '全局作用' },
]

const ruleTypeOptions = [
  { value: 'keyword', label: '关键字' },
  { value: 'uid', label: '作者 ID' },
]

const displayedScope = computed({
  get: () => selectedTime.value === 'expiring' ? FilterScope.Global : selectedScope.value,
  set: (value: FilterScope) => {
    selectedScope.value = value
  },
})

const manualScopeOptions = computed(() => {
  return selectedTime.value === 'expiring' ? expiringScopeOptions : FILTER_SCOPE_OPTIONS
})

const effectiveScope = computed(() => {
  return selectedTime.value === 'permanent' ? selectedScope.value : FilterScope.ExpiringGlobal
})

const scopedRules = computed(() => {
  return listRules(effectiveScope.value, {
    includeInherited: false,
    duration: 'all',
  })
})

const visibleRules = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword)
    return scopedRules.value

  return scopedRules.value.filter((rule) => {
    return rule.value.toLowerCase().includes(keyword)
      || rule.type.toLowerCase().includes(keyword)
      || `${rule.duration ?? ''}`.includes(keyword)
      || `${rule.expiresAt ?? ''}`.includes(keyword)
  })
})

const authorRules = computed(() => visibleRules.value.filter(rule => rule.type === 'uid'))
const keywordRules = computed(() => visibleRules.value.filter(rule => rule.type !== 'uid'))
const ruleCount = computed(() => visibleRules.value.length)
const displayedAuthorRules = computed(() => authorRules.value.slice(0, visibleRuleLimit.value))
const displayedKeywordRules = computed(() => keywordRules.value.slice(0, visibleRuleLimit.value))
const renderedRuleCount = computed(() => displayedAuthorRules.value.length + displayedKeywordRules.value.length)
const hasMoreRules = computed(() => renderedRuleCount.value < ruleCount.value)
const ruleCountText = computed(() => {
  return hasMoreRules.value ? `${renderedRuleCount.value}/${ruleCount.value} 项` : `${ruleCount.value} 项`
})

const currentRangeEnabled = computed({
  get: () => isScopeEnabled(effectiveScope.value),
  set: (value: boolean) => setScopeEnabled(effectiveScope.value, value),
})

const selectedTimeLabel = computed(() => {
  return timeOptions.find(option => option.value === selectedTime.value)?.label ?? ''
})

const selectedScopeLabel = computed(() => {
  return selectedTime.value === 'expiring'
    ? '全局作用'
    : (FILTER_SCOPE_OPTIONS.find(option => option.value === selectedScope.value)?.label ?? '')
})

const listFilterText = computed(() => {
  return `${selectedScopeLabel.value} · ${selectedTimeLabel.value}`
})

const currentPartitionLabel = computed(() => {
  return selectedTime.value === 'expiring' ? '期限' : selectedScopeLabel.value
})

const showExpiresColumn = computed(() => selectedTime.value === 'expiring')

const currentRangeSwitchTitle = computed(() => {
  return `${currentRangeEnabled.value ? '关闭' : '开启'}${selectedScopeLabel.value}屏蔽`
})

watch([effectiveScope, searchKeyword], () => {
  visibleRuleLimit.value = DEFAULT_VISIBLE_RULE_LIMIT
})

function formatRuleValue(rule: FilterRule) {
  if (showValues.value)
    return rule.value

  return rule.type === 'uid' ? '********' : '••••••'
}

function formatExpiresAt(rule: FilterRule) {
  if (!rule.expiresAt)
    return '永久'

  return `${rule.duration ?? ''} 天 · ${rule.expiresAt}`
}

function handleAddRule() {
  const value = newRuleValue.value.trim()
  if (!value)
    return

  const added = addRule({
    type: newRuleType.value,
    value,
    enabled: true,
    scope: effectiveScope.value,
    duration: selectedTime.value === 'permanent' ? undefined : 7,
  })

  if (!added) {
    toast.warning('过滤项已存在')
    return
  }

  newRuleValue.value = ''
}

async function handleRailAdd() {
  if (!showManualAdd.value) {
    showManualAdd.value = true
    await nextTick()
    ruleInputRef.value?.focus()
    return
  }

  handleAddRule()
}

function handleShowMoreRules() {
  visibleRuleLimit.value = ruleCount.value
}

function handleClearRules() {
  if (ruleCount.value === 0)
    return

  clearAllRules(effectiveScope.value, {
    duration: 'all',
  })
}

function handleExportShared() {
  exportToSharedSpace(effectiveScope.value)
  toast.success(`${currentPartitionLabel.value}分区数据已复制`)
}

function handleImportShared() {
  const result = importFromSharedSpace(effectiveScope.value)
  if (result.success)
    toast.success(`${currentPartitionLabel.value}数据已粘贴，去重${result.skipped ?? 0}条`)
  else
    toast.error(result.error ?? '导入失败')
}

function handleExportFile() {
  exportToFile()
}

function handleImportFile() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement)?.files?.[0]
  if (!file)
    return

  importFromFile(file).then((result) => {
    if (result.success)
      toast.success(`导入 ${result.imported ?? 0} 条，跳过 ${result.skipped ?? 0} 条`)
    else
      toast.error(result.error ?? '导入失败')
  })

  if (fileInputRef.value)
    fileInputRef.value.value = ''
}

function handleOrganizeRules() {
  const result = organizeRules()
  legacyStatus.value = getLegacyStatus()
  toast.success(`已整理：${result.promotedRules} 条归入全局，清理 ${result.expiredGroups} 组过期名单`)
}

function handleConvertLegacyFilters() {
  if (legacyStatus.value.hasNonEmptyLegacy) {
    const confirmed = window.confirm('检测到旧格式过滤数据。转换后会清空旧格式数据，是否继续？')
    if (!confirmed)
      return
  }

  const result = convertLegacyFilters()
  legacyStatus.value = getLegacyStatus()
  toast.success(`已转换 ${result.imported} 条，跳过 ${result.skipped} 条，清理 ${result.cleaned} 项旧数据`)
}
</script>

<template>
  <div class="filters-page">
    <section v-if="legacyStatus.hasLegacy" class="legacy-converter">
      <span>检测到旧版过滤数据</span>
      <button class="text-button" @click="handleConvertLegacyFilters">
        <i i-mingcute:transfer-3-line />
        转换
      </button>
    </section>

    <section class="filter-toolbar">
      <div class="search-block">
        <i i-mingcute:search-2-line />
        <input v-model="searchKeyword" placeholder="搜索过滤内容">
      </div>

      <div class="toolbar-selects">
        <div class="select-block">
          <span>时间</span>
          <Select v-model="selectedTime" :options="timeOptions" w="full" />
        </div>
      </div>

      <div class="toolbar-actions">
        <button class="icon-button" :title="showValues ? '隐藏列表内容' : '显示列表内容'" @click="showValues = !showValues">
          <i :class="showValues ? 'i-mingcute:eye-2-line' : 'i-mingcute:eye-close-line'" />
        </button>
        <button class="text-button" @click="handleImportFile">
          <i i-mingcute:download-2-line />
          <span class="action-label">导入</span>
        </button>
        <button class="text-button" @click="handleExportFile">
          <i i-mingcute:upload-2-line />
          <span class="action-label">导出</span>
        </button>
        <button class="text-button" title="清理过期名单，合并满足条件的数据到全局名单" @click="handleOrganizeRules">
          <i i-mingcute:broom-line />
          <span class="action-label">整理</span>
        </button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept=".json,application/json"
        hidden
        @change="handleFileChange"
      >
    </section>

    <section class="manual-toolbar">
      <div class="manual-scope-select">
        <Select v-model="displayedScope" :options="manualScopeOptions" w="full" />
      </div>
    </section>

    <section v-if="showManualAdd" class="add-toolbar">
      <div class="manual-type-select">
        <Select v-model="newRuleType" :options="ruleTypeOptions" w="full" />
      </div>
      <input
        ref="ruleInputRef"
        v-model="newRuleValue"
        class="rule-input"
        :placeholder="newRuleType === 'uid' ? '输入作者 ID' : '输入标题或作者关键字'"
        @keyup.enter="handleAddRule"
      >
    </section>

    <section class="filter-list-layout">
      <div class="filter-list-main">
        <div class="list-head">
          <span class="list-filter-text">{{ listFilterText }}</span>
          <span>{{ ruleCountText }}</span>
        </div>

        <div v-if="ruleCount === 0" class="empty-state">
          暂无过滤项
        </div>

        <div v-else class="rules-scroll">
          <div class="rule-sections">
            <div class="rule-section">
              <div class="section-title">
                <span>屏蔽作者 ID</span>
                <span>{{ authorRules.length }}</span>
              </div>
              <div class="section-columns" :class="{ 'with-expiry': showExpiresColumn }">
                <span>内容</span>
                <span v-if="showExpiresColumn">有效期</span>
              </div>
              <div v-if="authorRules.length === 0" class="section-empty">
                暂无内容
              </div>
              <div
                v-for="rule in displayedAuthorRules"
                :key="rule.id"
                class="rule-row"
                :class="{ 'disabled': !rule.enabled, 'with-expiry': showExpiresColumn }"
              >
                <span class="rule-value">{{ formatRuleValue(rule) }}</span>
                <span v-if="showExpiresColumn" class="rule-meta">{{ formatExpiresAt(rule) }}</span>
                <button class="row-action" title="删除" @click="removeRule(rule.id)">
                  <i i-mingcute:delete-2-line />
                </button>
              </div>
            </div>

            <div class="rule-section">
              <div class="section-title">
                <span>屏蔽关键字</span>
                <span>{{ keywordRules.length }}</span>
              </div>
              <div class="section-columns" :class="{ 'with-expiry': showExpiresColumn }">
                <span>内容</span>
                <span v-if="showExpiresColumn">有效期</span>
              </div>
              <div v-if="keywordRules.length === 0" class="section-empty">
                暂无内容
              </div>
              <div
                v-for="rule in displayedKeywordRules"
                :key="rule.id"
                class="rule-row"
                :class="{ 'disabled': !rule.enabled, 'with-expiry': showExpiresColumn }"
              >
                <span class="rule-value">{{ formatRuleValue(rule) }}</span>
                <span v-if="showExpiresColumn" class="rule-meta">{{ formatExpiresAt(rule) }}</span>
                <button class="row-action" title="删除" @click="removeRule(rule.id)">
                  <i i-mingcute:delete-2-line />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="filter-list-rail">
        <label class="rail-switch" :title="currentRangeSwitchTitle">
          <input v-model="currentRangeEnabled" type="checkbox">
          <span />
        </label>
        <button class="rail-button" title="展开更多" :disabled="!hasMoreRules" @click="handleShowMoreRules">
          <i i-mingcute:arrows-down-line />
        </button>
        <button class="rail-button" title="复制" :disabled="ruleCount === 0" @click="handleExportShared">
          <i i-mingcute:copy-2-line />
        </button>
        <button class="rail-button" title="粘贴" @click="handleImportShared">
          <i i-mingcute:clipboard-line />
        </button>
        <button class="rail-button" title="添加" @click="handleRailAdd">
          <i i-mingcute:add-line />
        </button>
        <button class="rail-button danger" title="清空" :disabled="ruleCount === 0" @click="handleClearRules">
          <i i-mingcute:delete-2-line />
        </button>
      </aside>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.filters-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--bew-text-1);
}

.filter-toolbar,
.legacy-converter,
.manual-toolbar,
.add-toolbar,
.filter-list-layout {
  position: relative;
  border: 1px solid var(--bew-border-color);
  border-radius: var(--bew-radius);
  background: var(--bew-fill-alt);
  box-shadow: var(--bew-shadow-edge-glow-1), var(--bew-shadow-1);
}

.legacy-converter {
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  color: var(--bew-text-2);
  font-size: 13px;
}

.filter-toolbar {
  z-index: 4;
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto max-content;
  align-items: center;
  gap: 8px;
  padding: 10px;
}

.toolbar-selects,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.search-block {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--bew-border-color);
  border-radius: var(--bew-radius);
  background: var(--bew-fill-1);
  color: var(--bew-text-2);
}

.search-block input {
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--bew-text-1);
}

.search-block input::placeholder,
.rule-input::placeholder {
  color: var(--bew-text-4);
  opacity: 1;
}

.select-block {
  display: grid;
  grid-template-columns: auto minmax(92px, 128px);
  align-items: center;
  gap: 6px;
  color: var(--bew-text-2);
  font-size: 13px;
}

.toolbar-actions {
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.icon-button,
.text-button,
.rail-button,
.row-action {
  border: 1px solid transparent;
  color: var(--bew-text-1);
  background: var(--bew-fill-1);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease,
    border-color 0.2s ease;
}

.icon-button,
.rail-button,
.row-action {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--bew-radius);
  font-size: 18px;
}

.icon-button {
  width: 32px;
  height: 32px;
  font-size: 17px;
}

.text-button {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: var(--bew-radius);
  font-size: 12px;
  white-space: nowrap;
}

.icon-button:hover,
.text-button:hover,
.rail-button:hover,
.row-action:hover {
  background: var(--bew-fill-2);
  border-color: var(--bew-border-color);
}

.manual-toolbar {
  z-index: 3;
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.add-toolbar {
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 12px;
}

.manual-scope-select,
.manual-type-select {
  min-width: 0;
}

.filter-list-layout {
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px;
}

.filter-list-main {
  min-width: 0;
  padding: 14px;
  border-right: 1px solid var(--bew-border-color);
  background: color-mix(in oklab, var(--bew-fill-1), transparent 35%);
}

.rule-input {
  width: 100%;
  min-width: 0;
  height: 40px;
  border: 1px solid var(--bew-border-color);
  border-radius: var(--bew-radius);
  background: var(--bew-fill-1);
  color: var(--bew-text-1);
  padding: 0 12px;
  outline: none;
}

.rule-input:focus {
  border-color: var(--bew-theme-color);
}

.list-head,
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--bew-text-2);
  font-size: 13px;
}

.list-head {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--bew-border-color);
}

.list-filter-text {
  min-width: 0;
  color: var(--bew-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state,
.section-empty {
  color: var(--bew-text-3);
  font-size: 13px;
}

.empty-state {
  padding: 56px 0;
  text-align: center;
}

.rule-sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.rules-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding-top: 14px;
  padding-right: 4px;
}

.rules-scroll::-webkit-scrollbar {
  width: 6px;
}

.rules-scroll::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.rules-scroll::-webkit-scrollbar-thumb {
  background: var(--bew-fill-3);
  border-radius: 3px;
}

.rule-section {
  min-width: 0;
}

.section-title {
  margin-bottom: 8px;
}

.section-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--bew-border-color);
  color: var(--bew-text-3);
  font-size: 12px;
}

.section-columns.with-expiry {
  grid-template-columns: minmax(0, 1fr) 140px;
}

.section-empty {
  padding: 18px 0;
}

.rule-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 0;
  border-bottom: 1px solid var(--bew-border-color);
}

.rule-row.with-expiry {
  grid-template-columns: minmax(0, 1fr) 140px 32px;
}

.rule-row.disabled {
  opacity: 0.52;
}

.rule-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--bew-text-1);
  font-size: 14px;
}

.rule-meta {
  color: var(--bew-text-3);
  font-size: 12px;
  white-space: nowrap;
}

.row-action {
  width: 30px;
  height: 30px;
  color: var(--bew-text-3);
  background: transparent;
}

.row-action:hover,
.danger:hover {
  color: #e5534b;
}

.filter-list-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 8px;
  background: color-mix(in oklab, var(--bew-fill-1), transparent 55%);
}

.rail-switch input {
  display: none;
}

.rail-switch span {
  position: relative;
  display: block;
  width: 36px;
  height: 22px;
  border-radius: 99px;
  background: var(--bew-fill-3);
  cursor: pointer;
  transition: background 0.2s ease;
}

.rail-switch span::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.rail-switch input:checked + span {
  background: var(--bew-theme-color);
}

.rail-switch input:checked + span::before {
  transform: translateX(14px);
}

button:disabled {
  cursor: default;
  opacity: 0.45;
}

button:disabled:hover {
  border-color: transparent;
  background: var(--bew-fill-1);
  color: var(--bew-text-1);
}

@media (max-width: 900px) {
  .toolbar-actions .text-button {
    width: 32px;
    padding: 0;
    justify-content: center;
  }

  .toolbar-actions .action-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
}

@media (max-width: 720px) {
  .filter-toolbar {
    grid-template-columns: minmax(0, 1fr);
    align-items: stretch;
  }

  .toolbar-selects,
  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }

  .select-block {
    grid-template-columns: auto minmax(0, 1fr);
    flex: 1;
  }

  .manual-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .add-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-list-layout {
    grid-template-columns: minmax(0, 1fr) 46px;
  }

  .rule-sections {
    grid-template-columns: minmax(0, 1fr);
  }

  .rule-row {
    grid-template-columns: minmax(0, 1fr) 32px;
  }

  .section-columns {
    grid-template-columns: minmax(0, 1fr);
  }

  .rule-row.with-expiry {
    grid-template-columns: minmax(0, 1fr) minmax(92px, 120px) 32px;
  }

  .section-columns.with-expiry {
    grid-template-columns: minmax(0, 1fr) minmax(92px, 120px);
  }
}
</style>
