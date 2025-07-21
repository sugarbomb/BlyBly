<script setup lang="ts">
import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'
import FilterTemplate from './FilterTemplate.vue'
</script>

<template>
  <div>
    <SettingsItemGroup title="" desc="">
      <SettingsItem title="" desc="">
        <template #bottom>
          <FilterTemplate
            title="热门内容过滤"
            description="过滤热门页面中不感兴趣的内容"
            storage-key="trending-filter"
            placeholder="输入要过滤的内容"
            :max-visible-rules="3"
            :default-collapsed="true"
          />
        </template>
      </SettingsItem>
    </SettingsItemGroup>

    <div class="my-8 border-b border-$bew-border-color" />

    <SettingsItemGroup title="" desc="">
      <SettingsItem title="" desc="">
        <template #bottom>
          <FilterTemplate
            title="排行榜内容过滤"
            description="过滤排行榜页面中不感兴趣的内容"
            storage-key="ranking-filter"
            placeholder="输入要过滤的内容"
            :max-visible-rules="3"
            :default-collapsed="true"
          />
        </template>
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>

<style lang="scss" scoped>
.my-8 {
  margin-top: 2rem;
  margin-bottom: 2rem;
}
</style>
