// src/components/Settings/BlockRules.vue
<script setup lang="ts">
import { useTrendingFilter } from '~/composables/useTrendingFilter'

const { blockRules, addBlockRule, removeBlockRule } = useTrendingFilter()

const newRule = ref({
  type: 'user' as const,
  value: ''
})

const addNewRule = () => {
  if (newRule.value.value.trim()) {
    addBlockRule(newRule.value.type, newRule.value.value.trim())
    newRule.value.value = ''
  }
}
</script>

<template>
  <div class="block-rules-settings">
    <h3>内容屏蔽设置</h3>
    
    <!-- 添加新规则 -->
    <div class="add-rule">
      <select v-model="newRule.type">
        <option value="user">UP主</option>
        <option value="title">标题</option>
      </select>
      <input 
        v-model="newRule.value" 
        :placeholder="newRule.type === 'user' ? '输入UP主名称或ID' : '输入标题关键词'"
      />
      <button @click="addNewRule">添加</button>
    </div>

    <!-- 规则列表 -->
    <div class="rules-list">
      <div v-for="(rule, index) in blockRules" :key="index" class="rule-item">
        <span>{{ rule.type === 'user' ? 'UP主' : '标题' }}: {{ rule.value }}</span>
        <button @click="removeBlockRule(index)">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-rules-settings {
  padding: 1rem;
}

.add-rule {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>