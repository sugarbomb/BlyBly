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
            title="热门页"
            description=" "
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
            title="排行页"
            description=" "
            storage-key="ranking-filter"
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
            title="随便看看"
            description=" "
            storage-key="foryou-filter"
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
