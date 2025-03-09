<template>
  <div class="content-filter-settings">
    <div class="section-title text-lg font-medium mb-4">
      {{ t('settings.contentFilter.title') }}
    </div>

    <!-- 热门内容过滤设置 -->
    <div class="section mb-6">
      <div class="section-header mb-2">
        <h3 class="text-base font-medium">{{ t('settings.contentFilter.trending') }}</h3>
        <p class="text-sm text-gray-500">{{ t('settings.contentFilter.trendingDesc') }}</p>
      </div>

      <!-- 屏蔽规则设置 -->
      <BlockRulesSettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BlockRulesSettings } from '../index'

const { t } = useI18n()
</script> 