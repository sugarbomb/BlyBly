<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { settings } from '~/logic'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const { t } = useI18n()

const sidebarPositions = computed(() => {
  return [
    {
      label: t('common.position.left'),
      value: 'left',
    },
    {
      label: t('common.position.right'),
      value: 'right',
    },
  ]
})
</script>

<template>
  <div>
    <SettingsItemGroup :title="$t('settings.group_sidebar')" :desc="$t('settings.group_sidebar_desc')">
      <SettingsItem :title="$t('settings.sidebar_position')">
        <Select v-model="settings.sidebarPosition" :options="sidebarPositions" w="full" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.auto_hide_sidebar')">
        <Radio v-model="settings.autoHideSidebar" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>
