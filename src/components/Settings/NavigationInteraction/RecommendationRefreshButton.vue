<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { settings } from '~/logic'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const { t } = useI18n()

const railPositions = computed(() => {
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

const railHeights = computed(() => {
  return [
    {
      label: t('settings.partition_control_rail_height_opt.default'),
      value: 0,
    },
    {
      label: t('settings.partition_control_rail_height_opt.highest'),
      value: 1,
    },
    {
      label: t('settings.partition_control_rail_height_opt.higher'),
      value: 2,
    },
    {
      label: t('settings.partition_control_rail_height_opt.middle'),
      value: 3,
    },
    {
      label: t('settings.partition_control_rail_height_opt.lower'),
      value: 4,
    },
    {
      label: t('settings.partition_control_rail_height_opt.lowest'),
      value: 5,
    },
  ]
})
</script>

<template>
  <div>
    <SettingsItemGroup
      :title="$t('settings.group_refresh_button')"
    >
      <SettingsItem
        :title="$t('settings.partition_control_rail_position')"
        :desc="$t('settings.partition_control_rail_position_desc')"
      >
        <Select v-model="settings.partitionControlRailPosition" :options="railPositions" w="full" />
      </SettingsItem>
      <SettingsItem
        :title="$t('settings.partition_control_rail_height')"
        :desc="$t('settings.partition_control_rail_height_desc')"
      >
        <Select v-model="settings.partitionControlRailHeight" :options="railHeights" w="full" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>
