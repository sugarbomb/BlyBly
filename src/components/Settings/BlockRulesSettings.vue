<script setup lang="ts">
import { ref } from 'vue'

import Select from '~/components/Select.vue'
import { useTrendingFilter } from '~/composables/useTrendingFilter'

const { blockRules, addBlockRule, removeBlockRule, toggleRuleStatus } = useTrendingFilter()

const newRule = ref({
  type: 'user' as const,
  value: '',
  remark: '',
})

function addNewRule() {
  if (newRule.value.value.trim()) {
    addBlockRule(
      newRule.value.type,
      newRule.value.value,
      newRule.value.remark,
    )
    // 重置表单
    newRule.value.value = ''
    newRule.value.remark = ''
  }
}
</script>

<template>
  <div class="block-rules-settings p-4">
    <div class="mb-4">
      <h3 class="text-lg font-medium mb-2">
        内容屏蔽设置
      </h3>

      <!-- 添加新规则表单 -->
      <div class="flex gap-2 items-end mb-4">
        <Select
          v-model="newRule.type"
          :options="[
            { value: 'user', label: 'UP主' },
            { value: 'title', label: '标题' },
          ]"
          class="w-24"
        />

        <input
          v-model="newRule.value"
          :placeholder="newRule.type === 'user' ? '输入UP主名称或ID' : '输入标题关键词'"
          class="flex-1 p-2 rounded bg-$bew-fill-1 border border-$bew-border-color text-$bew-text-1"
        >

        <input
          v-model="newRule.remark"
          placeholder="备注（可选）"
          class="flex-1 p-2 rounded bg-$bew-fill-1 border border-$bew-border-color text-$bew-text-1"
        >

        <button
          class="px-4 py-2 rounded bg-$bew-theme-color text-white disabled:opacity-50"
          :disabled="!newRule.value.trim()"
          @click="addNewRule"
        >
          添加
        </button>
      </div>

      <!-- 规则列表 -->
      <div class="space-y-2">
        <div
          v-for="rule in blockRules" :key="rule.id"
          class="flex items-center justify-between p-2 rounded bg-$bew-content border border-$bew-border-color"
        >
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              :checked="rule.enabled"
              @change="toggleRuleStatus(rule.id)"
            >
            <span class="px-2 py-1 text-xs rounded border border-$bew-border-color">
              {{ rule.type === 'user' ? 'UP主' : '标题' }}
            </span>
            <span class="ml-2">{{ rule.value }}</span>
            <span v-if="rule.remark" class="text-$bew-text-3 text-xs ml-2">
              ({{ rule.remark }})
            </span>
          </div>
          <button
            class="p-1 rounded hover:bg-$bew-fill-2"
            @click="removeBlockRule(rule.id)"
          >
            <i class="i-mingcute:delete-line" />
          </button>
        </div>

        <div v-if="!blockRules.length" class="text-center text-gray-500 py-4">
          暂无屏蔽规则
        </div>
      </div>
    </div>
  </div>
</template>
