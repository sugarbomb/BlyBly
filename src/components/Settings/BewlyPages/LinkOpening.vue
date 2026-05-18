<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { settings } from '~/logic'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const { t } = useI18n()

const openModeOptions = computed(() => {
  return [
    {
      label: t('settings.link_opening_behavior_opt.current_tab'),
      value: 'currentTab',
    },
    {
      label: t('settings.link_opening_behavior_opt.current_tab_if_not_homepage'),
      value: 'currentTabIfNotHomepage',
    },
    {
      label: t('settings.link_opening_behavior_opt.new_tab'),
      value: 'newTab',
    },
  ]
})

const videoCardOpenModeOptions = computed(() => {
  return [
    {
      label: t('settings.link_opening_behavior_opt.current_tab'),
      value: 'currentTab',
    },
    {
      label: t('settings.link_opening_behavior_opt.drawer'),
      value: 'drawer',
    },
    {
      label: t('settings.link_opening_behavior_opt.new_tab'),
      value: 'newTab',
    },
  ]
})
</script>

<template>
  <div>
    <SettingsItemGroup :title="$t('settings.group_link_opening_behavior')">
      <SettingsItem :title="$t('settings.top_bar_link_opening_behavior')">
        <Select v-model="settings.topBarLinkOpenMode" :options="openModeOptions" w="full" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.video_card_link_opening_behavior')">
        <Select
          v-model="settings.videoCardLinkOpenMode"
          :options="videoCardOpenModeOptions"
          w="full"
        />
      </SettingsItem>
      <SettingsItem :title="$t('settings.search_bar_link_opening_behavior')">
        <Select
          v-model="settings.searchBarLinkOpenMode"
          :options="openModeOptions"
          w="full"
        />
      </SettingsItem>
      <SettingsItem>
        <template #title>
          <div v-html="$t('settings.close_drawer_without_pressing_esc_again')" />
        </template>
        <Radio v-model="settings.closeDrawerWithoutPressingEscAgain" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>
