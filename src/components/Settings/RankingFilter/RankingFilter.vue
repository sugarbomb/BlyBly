<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref, onMounted } from 'vue'
import { useRankingFilter, type FilterRule } from '~/composables/useRankingFilter'

const { t, locale } = useI18n()
const { options, addRule, removeRule, updateRule, toggleRule, toggleFilterMode } = useRankingFilter()

// 调试国际化
onMounted(() => {
  console.log('Current locale:', locale.value)
  console.log('Translation test:', {
    title: t('settings.rankingFilter.title'),
    enable: t('settings.rankingFilter.enable'),
    filterMode: t('settings.rankingFilter.filterMode')
  })
})

const newRule = ref<Omit<FilterRule, 'id'>>({
  type: 'title',
  value: '',
  enabled: true,
})

const filterTypes = computed(() => [
  { value: 'title', label: t('settings.rankingFilter.ruleTypes.title') },
  { value: 'username', label: t('settings.rankingFilter.ruleTypes.username') },
  { value: 'uid', label: t('settings.rankingFilter.ruleTypes.uid') },
])

const isValidRule = computed(() => {
  return newRule.value.value.trim() !== ''
})

const handleAddRule = () => {
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

const handleRemoveRule = (id: string) => {
  removeRule(id)
}

const handleToggleRule = (id: string) => {
  toggleRule(id)
}
</script>

<template>
  <div class="ranking-filter-settings">
    <div class="section-title text-lg font-medium mb-4">
      {{ t('settings.rankingFilter.title') }}
    </div>
    
    <!-- 启用开关 -->
    <div class="section mb-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-base font-medium">{{ t('settings.rankingFilter.enable') }}</div>
          <div class="text-sm text-$bew-text-2">{{ t('settings.rankingFilter.enableDesc') }}</div>
        </div>
        <div>
          <input 
            type="checkbox" 
            v-model="options.enabled" 
            class="toggle"
          />
        </div>
      </div>
    </div>

    <!-- 过滤模式 -->
    <div class="section mb-6">
      <div class="section-header mb-2">
        <h3 class="text-base font-medium">{{ t('settings.rankingFilter.filterMode') }}</h3>
        <p class="text-sm text-$bew-text-2">{{ t('settings.rankingFilter.filterModeDesc') }}</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex gap-4">
          <div class="flex items-center gap-2">
            <input 
              type="radio" 
              id="blacklist" 
              value="blacklist" 
              v-model="options.mode" 
              name="filterMode"
            />
            <label for="blacklist">{{ t('settings.rankingFilter.modes.blacklist') }}</label>
          </div>
          <div class="flex items-center gap-2">
            <input 
              type="radio" 
              id="whitelist" 
              value="whitelist" 
              v-model="options.mode" 
              name="filterMode"
            />
            <label for="whitelist">{{ t('settings.rankingFilter.modes.whitelist') }}</label>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加规则 -->
    <div class="section mb-6">
      <div class="section-header mb-2">
        <h3 class="text-base font-medium">{{ t('settings.rankingFilter.addRule') }}</h3>
        <p class="text-sm text-$bew-text-2">{{ t('settings.rankingFilter.addRuleDesc') }}</p>
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
            :placeholder="t('settings.rankingFilter.inputValue')"
            @keyup.enter="handleAddRule"
            class="w-full p-2 rounded bg-$bew-fill-1 border border-$bew-border-color"
          />
        </div>
        <button 
          :disabled="!isValidRule" 
          @click="handleAddRule"
          class="px-4 py-2 rounded bg-$bew-theme-color text-white disabled:opacity-50"
        >
          {{ t('settings.rankingFilter.add') }}
        </button>
      </div>
    </div>

    <!-- 规则列表 -->
    <div class="section mb-6">
      <div class="section-header mb-2">
        <h3 class="text-base font-medium">{{ t('settings.rankingFilter.ruleList') }}</h3>
        <p class="text-sm text-$bew-text-2">{{ t('settings.rankingFilter.ruleListDesc') }}</p>
      </div>
      
      <div v-if="options.rules.length === 0" class="text-center py-4 text-$bew-text-2">
        {{ t('settings.rankingFilter.noRules') }}
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
            />
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