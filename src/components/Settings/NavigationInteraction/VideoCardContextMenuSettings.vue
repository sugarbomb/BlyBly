<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

import { useFilterAdvance } from '~/composables/useFilterAdvance'
import { settings } from '~/logic'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const toast = useToast()
const { t } = useI18n()
const { getLegacyStatus, convertLegacyFilters } = useFilterAdvance()
const legacyStatus = ref(getLegacyStatus())

function handleConvertLegacyFilters() {
  if (legacyStatus.value.hasNonEmptyLegacy) {
    const confirmed = window.confirm(t('settings.video_card_context_menu.convert_confirm'))
    if (!confirmed)
      return
  }

  const result = convertLegacyFilters()
  legacyStatus.value = getLegacyStatus()
  toast.success(t('settings.video_card_context_menu.convert_success', {
    imported: result.imported,
    skipped: result.skipped,
    cleaned: result.cleaned,
  }))
}
</script>

<template>
  <SettingsItemGroup :title="t('settings.video_card_context_menu.title')">
    <SettingsItem
      v-if="legacyStatus.hasLegacy"
      :title="t('settings.video_card_context_menu.convert_legacy')"
      :desc="t('settings.video_card_context_menu.convert_legacy_desc')"
    >
      <button class="convert-button" @click="handleConvertLegacyFilters">
        {{ t('settings.video_card_context_menu.convert') }}
      </button>
    </SettingsItem>
    <SettingsItem :title="t('settings.video_card_context_menu.global_block')" :desc="t('settings.video_card_context_menu.global_block_desc')">
      <Radio v-model="settings.videoCardContextMenuGroups.globalBlock" />
    </SettingsItem>
    <SettingsItem :title="t('settings.video_card_context_menu.block_user')" :desc="t('settings.video_card_context_menu.block_user_desc')">
      <Radio v-model="settings.videoCardContextMenuGroups.blockUserAssistant" />
    </SettingsItem>
    <SettingsItem :title="t('settings.video_card_context_menu.block_video')" :desc="t('settings.video_card_context_menu.block_video_desc')">
      <Radio v-model="settings.videoCardContextMenuGroups.blockVideoAssistant" />
    </SettingsItem>
    <SettingsItem :title="t('settings.video_card_context_menu.open_ways')" :desc="t('settings.video_card_context_menu.open_ways_desc')">
      <Radio v-model="settings.videoCardContextMenuGroups.openWays" />
    </SettingsItem>
    <SettingsItem :title="t('settings.video_card_context_menu.copy')" :desc="t('settings.video_card_context_menu.copy_desc')">
      <Radio v-model="settings.videoCardContextMenuGroups.copyAssistant" />
    </SettingsItem>
    <SettingsItem :title="t('settings.video_card_context_menu.view_cover')">
      <Radio v-model="settings.videoCardContextMenuGroups.cover" />
    </SettingsItem>
  </SettingsItemGroup>
</template>

<style lang="scss" scoped>
.convert-button {
  height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--bew-radius);
  color: var(--bew-text-1);
  background: var(--bew-fill-1);
  cursor: pointer;
}

.convert-button:hover {
  background: var(--bew-fill-2);
}
</style>
