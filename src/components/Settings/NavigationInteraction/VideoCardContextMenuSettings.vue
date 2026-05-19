<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'vue-toastification'

import { useFilterAdvance } from '~/composables/useFilterAdvance'
import { settings } from '~/logic'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const toast = useToast()
const { getLegacyStatus, convertLegacyFilters } = useFilterAdvance()
const legacyStatus = ref(getLegacyStatus())

function handleConvertLegacyFilters() {
  if (legacyStatus.value.hasNonEmptyLegacy) {
    const confirmed = window.confirm('检测到旧格式过滤数据。转换后会清空旧格式数据，是否继续？')
    if (!confirmed)
      return
  }

  const result = convertLegacyFilters()
  legacyStatus.value = getLegacyStatus()
  toast.success(`已转换 ${result.imported} 条，跳过 ${result.skipped} 条，清理 ${result.cleaned} 项旧数据`)
}
</script>

<template>
  <SettingsItemGroup title="卡片菜单">
    <SettingsItem
      v-if="legacyStatus.hasLegacy"
      title="请先转换旧格式数据"
      desc="！检测到本地存在旧格式数据，请先转换数据后再使用屏蔽功能。"
    >
      <button class="convert-button" @click="handleConvertLegacyFilters">
        转换
      </button>
    </SettingsItem>
    <SettingsItem title="UP 主屏蔽辅助组" desc="包含屏蔽此 UP 主和 7/15 天临时屏蔽。">
      <Radio v-model="settings.videoCardContextMenuGroups.blockUserAssistant" />
    </SettingsItem>
    <SettingsItem title="视频屏蔽辅助组" desc="包含 7/15 天临时屏蔽此视频。">
      <Radio v-model="settings.videoCardContextMenuGroups.blockVideoAssistant" />
    </SettingsItem>
    <SettingsItem title="打开方式功能组">
      <Radio v-model="settings.videoCardContextMenuGroups.openWays" />
    </SettingsItem>
    <SettingsItem title="复制辅助组">
      <Radio v-model="settings.videoCardContextMenuGroups.copyAssistant" />
    </SettingsItem>
    <SettingsItem title="查看封面">
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
