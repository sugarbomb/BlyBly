<script setup lang="ts">
import { settings } from '~/logic'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'
</script>

<template>
  <div>
    <SettingsItemGroup :title="$t('settings.group_ads')">
      <SettingsItem :title="$t('settings.block_ads')">
        <Radio v-model="settings.blockAds" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.block_top_search_page_ads')" :desc="$t('settings.block_top_search_page_ads_desc')">
        <Radio v-model="settings.blockTopSearchPageAds" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>
