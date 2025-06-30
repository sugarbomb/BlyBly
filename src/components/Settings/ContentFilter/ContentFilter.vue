<script setup lang="ts">
import { BlockRulesSettings } from '../index'
</script>

<template>
  <div class="content-filter-settings">
    <div class="section-title text-lg font-medium mb-4">
      内容过滤设置
    </div>

    <!-- 热门内容过滤设置 -->
    <div class="section mb-6">
      <div class="section-header mb-2">
        <h3 class="text-base font-medium">
          热门内容过滤
        </h3>
        <p class="text-sm text-$bew-text-2">
          设置对热门内容的屏蔽规则
        </p>
      </div>

      <!-- 屏蔽规则设置 -->
      <BlockRulesSettings />
    </div>
  </div>
</template>
