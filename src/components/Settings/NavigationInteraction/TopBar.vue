<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { settings } from '~/logic'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const { t } = useI18n()

const topBarIconBadgesOptions = computed(() => {
  return [
    {
      label: t('settings.top_bar_icon_badges_opt.number'),
      value: 'number',
    },
    {
      label: t('settings.top_bar_icon_badges_opt.dot'),
      value: 'dot',
    },
    {
      label: t('settings.top_bar_icon_badges_opt.none'),
      value: 'none',
    },
  ]
})
</script>

<template>
  <div>
    <SettingsItemGroup :title="$t('settings.group_topbar')">
      <SettingsItem :title="$t('settings.use_old_top_bar')">
        <Radio v-model="settings.useOldTopBar" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.auto_hide_top_bar')">
        <Radio v-model="settings.autoHideTopBar" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.show_top_bar_theme_color_gradient')">
        <Radio v-model="settings.showTopBarThemeColorGradient" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.show_bewly_or_bili_top_bar_switcher')">
        <Radio v-model="settings.showBewlyOrBiliTopBarSwitcher" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.show_bewly_or_bili_page_switcher')">
        <Radio v-model="settings.showBewlyOrBiliPageSwitcher" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.top_bar_icon_badges')">
        <Select v-model="settings.topBarIconBadges" :options="topBarIconBadgesOptions" w="full" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.open_notifications_page_as_drawer')">
        <Radio v-model="settings.openNotificationsPageAsDrawer" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>
