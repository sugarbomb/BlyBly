<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { RecommendationControlSettings, RecommendationRegion } from '~/components/RecommendationLayout/types'
import { normalizeRecommendationNumber, useRecommendationControls } from '~/composables/useRecommendationLayoutSettings'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const props = defineProps<{ region: RecommendationRegion }>()
const { t } = useI18n()
const controls = useRecommendationControls(() => props.region)
const positionOptions = computed(() => ['left', 'right'].map(value => ({
  value,
  label: t(`common.position.${value}`),
})))
const heightOptions = computed(() => ['default', 'highest', 'higher', 'middle', 'lower', 'lowest'].map((key, value) => ({
  value,
  label: t(`settings.partition_control_rail_height_opt.${key}`),
})))

type NumberSettingKey = 'pullThreshold'

interface NumberField {
  key: NumberSettingKey
  label: string
  min: number
  max: number
}

const pullFields = computed<NumberField[]>(() => controls.value.pullEnabled
  ? [
      { key: 'pullThreshold', label: 'pull_threshold', min: 30, max: 400 },
    ]
  : [])

function patchControls(patch: Partial<RecommendationControlSettings>) {
  const next = { ...controls.value, ...patch }
  if (patch.automaticBottom === true) {
    next.manualButton = false
    next.wheelEnabled = false
    next.pullEnabled = false
  }
  else if (patch.manualButton === true || patch.wheelEnabled === true || patch.pullEnabled === true) {
    next.automaticBottom = false
  }
  next.fixedItems = normalizeRecommendationNumber(next.fixedItems, 10, 1, 100)
  next.wheelConfirmThreshold = Math.max(next.wheelThreshold + 1, next.wheelConfirmThreshold)
  next.pullConfirmThreshold = Math.max(next.pullThreshold + 1, next.pullConfirmThreshold)
  controls.value = next
}

function updateNumber(field: NumberField, event: Event) {
  const input = event.target as HTMLInputElement
  patchControls({ [field.key]: normalizeRecommendationNumber(input.value, controls.value[field.key], field.min, field.max) })
  input.value = String(controls.value[field.key])
}
</script>

<template>
  <div>
    <SettingsItemGroup :title="t('settings.recommendation_layout.loading')">
      <SettingsItem :title="t('settings.recommendation_layout.automatic')" :desc="t('settings.recommendation_layout.automatic_desc')">
        <Radio :model-value="controls.automaticBottom" @update:model-value="patchControls({ automaticBottom: $event })" />
      </SettingsItem>

      <SettingsItem :title="t('settings.recommendation_layout.manual_button')" :desc="t('settings.recommendation_layout.manual_button_desc')">
        <Radio :model-value="controls.manualButton" @update:model-value="patchControls({ manualButton: $event })" />
      </SettingsItem>
      <template v-if="controls.manualButton">
        <SettingsItem class="control-detail" :title="t('settings.partition_control_rail_position')">
          <Select :model-value="controls.toolsSide" :options="positionOptions" w="full" @update:model-value="patchControls({ toolsSide: $event })" />
        </SettingsItem>
        <SettingsItem class="control-detail" :title="t('settings.partition_control_rail_height')">
          <Select :model-value="controls.toolsHeight" :options="heightOptions" w="full" @update:model-value="patchControls({ toolsHeight: $event })" />
        </SettingsItem>
      </template>

      <SettingsItem :title="t('settings.recommendation_layout.wheel')" :desc="t('settings.recommendation_layout.wheel_desc')">
        <Radio :model-value="controls.wheelEnabled" @update:model-value="patchControls({ wheelEnabled: $event })" />
      </SettingsItem>
      <SettingsItem :title="t('settings.recommendation_layout.pull')" :desc="t('settings.recommendation_layout.pull_desc')">
        <Radio :model-value="controls.pullEnabled" @update:model-value="patchControls({ pullEnabled: $event })" />
      </SettingsItem>
      <template v-if="controls.pullEnabled">
        <SettingsItem v-for="field in pullFields" :key="field.key" class="control-detail" :title="t('settings.recommendation_layout.pull_distance')" :desc="t('settings.recommendation_layout.pull_distance_desc')">
          <input
            class="number-setting" type="number" :value="controls[field.key]" :min="field.min" :max="field.max"
            step="1" :aria-label="t('settings.recommendation_layout.pull_distance')" @change="updateNumber(field, $event)" @keydown.stop
          >
        </SettingsItem>
      </template>
    </SettingsItemGroup>

    <SettingsItemGroup :title="t('settings.recommendation_layout.quantity')">
      <SettingsItem :title="t('settings.recommendation_layout.auto_fill')" :desc="t('settings.recommendation_layout.auto_fill_desc')">
        <Radio :model-value="controls.autoFill" @update:model-value="patchControls({ autoFill: $event })" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>

<style scoped lang="scss">
.control-detail {
  border-top: none !important;
}

.number-setting {
  box-sizing: border-box;
  width: 100%;
  height: 35px;
  padding: 0 12px;
  border-radius: var(--bew-radius);
  background: var(--bew-fill-1);
  color: inherit;
}
</style>
