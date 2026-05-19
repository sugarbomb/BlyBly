<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { settings } from '~/logic'
import { isHomePage } from '~/utils/main'

import { version } from '../../../../package.json'
import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const { t, locale } = useI18n()

const langOptions = computed(() => {
  return [
    {
      label: t('settings.select_language_opt.english'),
      value: 'en',
    },
    {
      label: t('settings.select_language_opt.mandarin_cn'),
      value: 'cmn-CN',
    },
    {
      label: t('settings.select_language_opt.mandarin_tw'),
      value: 'cmn-TW',
    },
    {
      label: t('settings.select_language_opt.jyut'),
      value: 'jyut',
    },
  ]
})

const fontPreferenceOptions = computed(() => {
  return [
    {
      label: t('settings.customize_font_opt.default'),
      value: 'default',
    },
    {
      label: t('settings.customize_font_opt.recommend'),
      value: 'recommend',
    },
    {
      label: t('settings.customize_font_opt.custom'),
      value: 'custom',
    },
  ]
})

watch(() => settings.value.language, (newValue) => {
  locale.value = newValue
})

watch(() => settings.value.useOriginalBilibiliHomepage, () => {
  if (isHomePage())
    location.reload()
})
</script>

<template>
  <div>
    <SettingsItemGroup :title="`功能速览 · v${version}`">
      <SettingsItem title="刷新按钮设置" desc="查看 导航与交互 - 看看按钮 - 刷新按钮" />
      <SettingsItem title="卡片菜单设置" desc="查看 导航与交互 - 视频卡片 - 卡片菜单" />
      <SettingsItem title="新屏蔽列表导航" desc="查看 Bly 增强 - 内容屏蔽" />
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_common')">
      <SettingsItem :title="$t('settings.use_original_bilibili_topbar')">
        <Radio v-model="settings.useOriginalBilibiliTopBar" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.use_original_bilibili_homepage')">
        <template #desc>
          <span color="$bew-error-color" v-text="$t('settings.use_original_bilibili_homepage_desc')" />
        </template>
        <Radio v-model="settings.useOriginalBilibiliHomepage" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_languages_and_fonts')">
      <SettingsItem :title="$t('settings.select_language')">
        <Select
          v-model="settings.language"
          :options="langOptions"
          w="full"
        />
      </SettingsItem>
      <SettingsItem :title="$t('settings.customize_font')">
        <Select
          v-model="settings.customizeFont"
          :options="fontPreferenceOptions"
          w="full"
        />
        <template v-if="settings.customizeFont === 'custom'" #bottom>
          <Input v-model="settings.fontFamily" @keydown.stop.passive="() => {}" />
          <div text="sm $bew-text-2" mt-1 v-html="t('settings.customize_font_desc')" />
        </template>
      </SettingsItem>
      <SettingsItem :title="$t('settings.remove_the_indent_from_chinese_punctuation')" :desc="$t('settings.remove_the_indent_from_chinese_punctuation_desc')">
        <Radio v-model="settings.removeTheIndentFromChinesePunctuation" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.override_danmaku_font')" :desc="$t('settings.override_danmaku_font_desc')">
        <Radio v-model="settings.overrideDanmakuFont" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>

<style lang="scss" scoped>
</style>
