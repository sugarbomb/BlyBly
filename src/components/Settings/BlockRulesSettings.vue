<template>
  <div class="block-rules-settings p-4">
    <div class="mb-4">
      <h3 class="text-lg font-medium mb-2">内容屏蔽设置</h3>
      
      <!-- 添加新规则表单 -->
      <div class="flex gap-2 mb-4">
        <select 
          v-model="newRule.type"
          class="px-2 py-1 border rounded"
        >
          <option value="user">UP主</option>
          <option value="title">标题</option>
        </select>
        
        <input 
          v-model="newRule.value"
          :placeholder="newRule.type === 'user' ? '输入UP主名称或ID' : '输入标题关键词'"
          class="flex-1 px-2 py-1 border rounded"
        />
        
        <input 
          v-model="newRule.remark"
          placeholder="备注（可选）"
          class="flex-1 px-2 py-1 border rounded"
        />
        
        <button 
          @click="addNewRule"
          class="px-4 py-1 bg-primary text-white rounded hover:bg-primary-dark"
          :disabled="!newRule.value.trim()"
        >
          添加
        </button>
      </div>

      <!-- 规则列表 -->
      <div class="space-y-2">
        <div v-for="rule in blockRules" :key="rule.id" 
          class="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              :checked="rule.enabled"
              @change="toggleRuleStatus(rule.id)"
            />
            <span class="text-sm font-medium">
              {{ rule.type === 'user' ? 'UP主' : '标题' }}:
            </span>
            <span>{{ rule.value }}</span>
            <span v-if="rule.remark" class="text-gray-500 text-sm">
              ({{ rule.remark }})
            </span>
          </div>
          
          <button 
            @click="removeBlockRule(rule.id)"
            class="text-red-500 hover:text-red-600"
          >
            删除
          </button>
        </div>
        
        <div v-if="!blockRules.length" class="text-center text-gray-500 py-4">
          暂无屏蔽规则
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTrendingFilter } from '~/composables/useTrendingFilter'

const { blockRules, addBlockRule, removeBlockRule, toggleRuleStatus } = useTrendingFilter()

const newRule = ref({
  type: 'user' as const,
  value: '',
  remark: ''
})

const addNewRule = () => {
  if (newRule.value.value.trim()) {
    addBlockRule(
      newRule.value.type,
      newRule.value.value,
      newRule.value.remark
    )
    // 重置表单
    newRule.value.value = ''
    newRule.value.remark = ''
  }
}
</script> 