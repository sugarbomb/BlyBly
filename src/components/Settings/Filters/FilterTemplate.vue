<script setup lang="ts">
import { computed, ref } from 'vue'

import Select from '~/components/Select.vue'
import { type FilterRule, useFilterAdvance } from '~/composables/useFilterAdvance'

interface Props {
  title: string
  description?: string
  storageKey: string
  placeholder?: string
  maxVisibleRules?: number
  defaultCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  placeholder: '输入过滤内容',
  maxVisibleRules: 1,
  defaultCollapsed: false,
})

const { options, addRule, removeRule, toggleRule, exportToSharedSpace, importFromSharedSpace, exportToFile, importFromFile, clearAllRules } = useFilterAdvance(props.storageKey)

const newRule = ref<Omit<FilterRule, 'id'>>({
  type: 'title',
  value: '',
  enabled: true,
})

const filterTypes = computed(() => [
  { value: 'title', label: '标题' },
  { value: 'username', label: '用户名' },
  { value: 'uid', label: '用户ID' },
])

const isValidRule = computed(() => {
  return newRule.value.value.trim() !== ''
})

// 折叠相关状态
const isCollapsed = ref(props.defaultCollapsed)
const showCollapseButton = computed(() => options.value.rules.length > props.maxVisibleRules)
const visibleRules = computed(() => {
  if (!showCollapseButton.value || !isCollapsed.value) {
    return options.value.rules
  }
  return options.value.rules.slice(0, props.maxVisibleRules)
})

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// 悬停显示原始内容相关状态
const hoveredRuleId = ref<string | null>(null)

function setHoveredRule(id: string | null) {
  hoveredRuleId.value = id
}

function handleClearRules() {
  if (options.value.rules.length === 0)
    return
  clearAllRules()
}

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

function handleExportShared() {
  exportToSharedSpace()
}
function handleImportShared() {
  importFromSharedSpace()
}

const fileInputRef = ref<HTMLInputElement>()

function handleExportFile() {
  exportToFile()
}

function handleImportFile() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement)?.files?.[0]
  if (file) {
    importFromFile(file).then((result) => {
      if (result.success) {
        // 可以添加成功提示
        // console.log(`导入成功: ${result.imported} 条规则, 跳过: ${result.skipped} 条`)
      }
      else {
        // 可以添加错误提示
        console.error(`导入失败: ${result.error}`)
      }
    })
    // 清空文件输入，允许重复选择同一文件
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}
</script>

<template>
  <div class="filter-template">
    <!-- 过滤器标题和总开关 -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-medium">
          {{ title }}
        </h3>
        <p v-if="description" class="text-sm text-$bew-text-2 mt-1">
          {{ description }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-$bew-text-2">启用过滤</span>
        <input v-model="options.enabled" type="checkbox" class="toggle">
      </div>
    </div>

    <!-- 添加新规则表单 -->
    <div class="flex gap-2 items-end mb-4">
      <div class="min-w-20 flex-shrink-0 filter-select">
        <Select v-model="newRule.type" :options="filterTypes" class="w-full" />
      </div>

      <div class="flex-1">
        <input
          v-model="newRule.value"
          :placeholder="placeholder"
          class="w-full p-2 rounded bg-$bew-fill-1 border border-$bew-border-color text-$bew-text-1"
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

    <!-- 规则列表 -->
    <div class="space-y-2">
      <div v-if="options.rules.length === 0" class="text-center text-$bew-text-3 py-4">
        暂无过滤规则
      </div>

      <!-- 批量操作工具栏 -->
      <div class="flex items-center justify-between mb-3 gap-2">
        <div class="flex items-center gap-2">
          <button
            :disabled="options.rules.length === 0"
            class="px-2 py-1 text-xs rounded bg-$bew-fill-2 hover:bg-$bew-fill-3 text-$bew-text-3 hover:text-$bew-text-2 transition-colors disabled:opacity-50"
            @click="handleExportShared"
          >
            <i class="i-mingcute:export-line mr-1" />
            复制
          </button>
          <button
            class="px-2 py-1 text-xs rounded bg-$bew-fill-2 hover:bg-$bew-fill-3 text-$bew-text-3 hover:text-$bew-text-2 transition-colors"
            @click="handleImportShared"
          >
            <i class="i-mingcute:import-line mr-1" />
            粘贴
          </button>
          <button
            :disabled="options.rules.length === 0"
            class="px-2 py-1 text-xs rounded bg-$bew-fill-2 hover:bg-$bew-fill-3 text-$bew-text-3 hover:text-$bew-text-2 transition-colors disabled:opacity-50"
            @click="handleExportFile"
          >
            <i class="i-mingcute:upload-line mr-1" />
            导出
          </button>
          <button
            class="px-2 py-1 text-xs rounded bg-$bew-fill-2 hover:bg-$bew-fill-3 text-$bew-text-3 hover:text-$bew-text-2 transition-colors"
            @click="handleImportFile"
          >
            <i class="i-mingcute:download-line mr-1" />
            导入
          </button>
          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleFileChange"
          >
          <button
            :disabled="options.rules.length === 0"
            class="px-2 py-1 text-xs rounded bg-$bew-fill-2 hover:bg-$bew-fill-3 text-$bew-text-3 hover:text-$bew-text-2 transition-colors disabled:opacity-50"
            @click="handleClearRules"
          >
            <i class="i-mingcute:delete-2-line mr-1" />
            清空
          </button>
        </div>
        <div v-if="showCollapseButton" class="flex items-center gap-2">
          <span class="text-xs text-$bew-text-3">展开全部</span>
          <input
            :checked="!isCollapsed"
            type="checkbox"
            class="toggle-small"
            @change="toggleCollapse"
          >
        </div>
      </div>

      <!-- 规则列表头部 -->
      <div v-if="options.rules.length > 0" class="flex items-center justify-between mb-3">
        <div class="text-sm text-$bew-text-2">
          过滤规则列表 ({{ options.rules.length }})
        </div>
      </div>

      <!-- 规则项 -->
      <div class="rules-container">
        <div
          v-for="rule in visibleRules"
          :key="rule.id"
          class="flex items-center justify-between p-3 rounded bg-$bew-fill-1 border border-$bew-border-color rule-item"
          :class="{ 'opacity-50': !rule.enabled }"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <input
              type="checkbox"
              :checked="rule.enabled"
              @change="handleToggleRule(rule.id)"
            >
            <div class="min-w-0 flex flex-col">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-1 text-xs rounded bg-$bew-fill-2 border border-$bew-border-color">
                  {{ filterTypes.find(t => t.value === rule.type)?.label }}
                </span>
                <span class="text-sm font-medium break-all">
                  {{ hoveredRuleId === rule.id ? rule.value : '***' }}
                </span>
              </div>
            </div>
          </div>
          <button
            class="p-2 rounded hover:bg-$bew-fill-2 text-$bew-text-3 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
            @click="handleRemoveRule(rule.id)"
            @mouseenter="setHoveredRule(rule.id)"
            @mouseleave="setHoveredRule(null)"
          >
            <i class="i-mingcute:delete-line" />
          </button>
        </div>
      </div>
    </div>

    <!-- 折叠提示 -->
    <div v-if="showCollapseButton && isCollapsed" class="text-center py-2">
      <span class="text-xs text-$bew-text-3">
        ...
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.filter-template {
  .toggle {
    @apply relative inline-block w-10 h-6 appearance-none cursor-pointer;
    background: var(--bew-fill-2);
    border-radius: 1rem;
    transition: all 0.2s ease;

    &:checked {
      background: var(--bew-theme-color);
    }

    &::before {
      content: "";
      @apply absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm;
      transition: transform 0.2s ease;
    }

    &:checked::before {
      transform: translateX(1rem);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(var(--bew-theme-color-rgb), 0.2);
    }
  }

  .filter-select {
    /* 允许下拉框的下拉部分扩展到更宽 */
    :deep() {
      & > div:last-child {
        min-width: 100px;
        width: max-content;
      }
    }
  }

  .toggle-small {
    @apply relative inline-block w-8 h-4 appearance-none cursor-pointer;
    background: var(--bew-fill-2);
    border-radius: 0.75rem;
    transition: all 0.2s ease;

    &:checked {
      background: var(--bew-theme-color);
    }

    &::before {
      content: "";
      @apply absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm;
      transition: transform 0.2s ease;
    }

    &:checked::before {
      transform: translateX(1rem);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(var(--bew-theme-color-rgb), 0.2);
    }
  }

  .rules-container {
    @apply space-y-2;
    max-height: 400px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: var(--bew-fill-1);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--bew-fill-3);
      border-radius: 3px;

      &:hover {
        background: var(--bew-border-color);
      }
    }
  }

  .rule-item {
    transition: all 0.2s ease;

    &:hover {
      transform: translateX(2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}
</style>
