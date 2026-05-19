<script setup lang="ts">
import { settings } from '~/logic'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'
</script>

<template>
  <div>
    <SettingsItemGroup :title="$t('settings.group_touch_screen')">
      <SettingsItem :title="$t('settings.touch_screen_optimization')" :desc="$t('settings.touch_screen_optimization_desc')">
        <Radio v-model="settings.touchScreenOptimization" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>
