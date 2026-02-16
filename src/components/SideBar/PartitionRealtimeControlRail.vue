<script setup lang="ts">
import { computed } from 'vue'

import Button from '~/components/Button.vue'
import Tooltip from '~/components/Tooltip.vue'

import PartitionPanelToggleButton from './PartitionPanelToggleButton.vue'

const props = withDefaults(defineProps<{
  loading: boolean
  modelValue?: boolean
  variant?: 'sidebar' | 'floating' | 'inline'
  statusIcon?: string
  statusColor?: string
  statusLabel?: string
  switchDisabled?: boolean
}>(), {
  modelValue: false,
  variant: 'sidebar',
  statusIcon: '',
  statusColor: '',
  statusLabel: '未选择分区',
  switchDisabled: false,
})

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'update:modelValue', value: boolean): void
  (e: 'switchPartition'): void
}>()

const panelStatusLabel = computed(() => {
  return props.modelValue ? `${props.statusLabel}（面板已打开）` : `${props.statusLabel}（面板已关闭）`
})

const resolvedStatusIcon = computed(() => {
  return props.statusIcon || 'i-mingcute:layout-grid-line'
})

function handleIndicatorToggle() {
  if (props.loading)
    return
  emit('update:modelValue', !props.modelValue)
}

function handleSwitchPartition() {
  if (props.loading || props.switchDisabled)
    return
  emit('switchPartition')
}
</script>

<template>
  <aside
    v-if="props.variant === 'sidebar'"
    pos="sticky top-150px"
    h="[calc(100vh-140px)]"
    w-56px shrink-0
  >
    <div flex="~ col items-center">
      <div
        style="backdrop-filter: var(--bew-filter-glass-1)"
        bg="$bew-elevated" p-2 rounded="$bew-radius"
        shadow="[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]"
        box-border border="1 $bew-border-color"
        flex="~ col items-center gap-2"
      >
        <Tooltip :content="$t('common.operation.refresh')" placement="left">
          <Button
            type="secondary"
            :disabled="props.loading"
            :loading="props.loading"
            round
            center
            class="rail-btn"
            @click="emit('refresh')"
          >
            <div i-mingcute:refresh-2-line text="lg" />
          </Button>
        </Tooltip>

        <Tooltip :content="`${panelStatusLabel}（点击开关面板）`" placement="left">
          <Button
            type="secondary"
            :disabled="props.loading"
            round
            center
            class="rail-btn mode-indicator"
            @click="handleIndicatorToggle"
          >
            <svg v-if="resolvedStatusIcon.startsWith('#')" aria-hidden="true" class="status-icon">
              <use :xlink:href="resolvedStatusIcon" />
            </svg>
            <i
              v-else-if="resolvedStatusIcon.startsWith('i-')"
              :class="resolvedStatusIcon"
              :style="{ color: props.statusColor || undefined }"
              class="status-icon"
              aria-hidden="true"
            />
            <img
              v-else-if="resolvedStatusIcon"
              :src="resolvedStatusIcon"
              alt=""
              class="status-icon"
            >
            <div v-else i-mingcute:layout-grid-line text="lg" />
          </Button>
        </Tooltip>

        <PartitionPanelToggleButton
          label="切换已选分区"
          :disabled="props.loading || props.switchDisabled"
          @switch="handleSwitchPartition"
        />
      </div>
    </div>
  </aside>

  <div
    v-else-if="props.variant === 'floating'"
    pos="fixed right-14px top-1/2"
    style="transform: translateY(-50%)"
    z-100
    flex="~ col"
  >
    <div
      style="backdrop-filter: var(--bew-filter-glass-1)"
      bg="$bew-elevated" p-2 rounded="$bew-radius"
      shadow="[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]"
      box-border border="1 $bew-border-color"
      flex="~ col items-center gap-2"
    >
      <Tooltip :content="$t('common.operation.refresh')" placement="left">
        <Button
          type="secondary"
          :loading="props.loading"
          :disabled="props.loading"
          round
          center
          class="rail-btn"
          @click="emit('refresh')"
        >
          <div i-mingcute:refresh-2-line text="lg" />
        </Button>
      </Tooltip>

      <Tooltip :content="`${panelStatusLabel}（点击开关面板）`" placement="left">
        <Button
          type="secondary"
          :disabled="props.loading"
          round
          center
          class="rail-btn mode-indicator"
          @click="handleIndicatorToggle"
        >
          <svg v-if="resolvedStatusIcon.startsWith('#')" aria-hidden="true" class="status-icon">
            <use :xlink:href="resolvedStatusIcon" />
          </svg>
          <i
            v-else-if="resolvedStatusIcon.startsWith('i-')"
            :class="resolvedStatusIcon"
            :style="{ color: props.statusColor || undefined }"
            class="status-icon"
            aria-hidden="true"
          />
          <img
            v-else-if="resolvedStatusIcon"
            :src="resolvedStatusIcon"
            alt=""
            class="status-icon"
          >
          <div v-else i-mingcute:layout-grid-line text="lg" />
        </Button>
      </Tooltip>

      <PartitionPanelToggleButton
        label="切换已选分区"
        :disabled="props.loading || props.switchDisabled"
        @switch="handleSwitchPartition"
      />
    </div>
  </div>

  <div
    v-else
    flex="~ items-center gap-2"
    w-full
  >
    <Tooltip :content="$t('common.operation.refresh')" placement="bottom">
      <Button
        type="secondary"
        :loading="props.loading"
        :disabled="props.loading"
        round
        center
        class="rail-btn"
        @click="emit('refresh')"
      >
        <div i-mingcute:refresh-2-line text="lg" />
      </Button>
    </Tooltip>

    <Tooltip :content="`${panelStatusLabel}（点击开关面板）`" placement="bottom">
      <Button
        type="secondary"
        :disabled="props.loading"
        round
        center
        class="rail-btn mode-indicator"
        @click="handleIndicatorToggle"
      >
        <svg v-if="resolvedStatusIcon.startsWith('#')" aria-hidden="true" class="status-icon">
          <use :xlink:href="resolvedStatusIcon" />
        </svg>
        <i
          v-else-if="resolvedStatusIcon.startsWith('i-')"
          :class="resolvedStatusIcon"
          :style="{ color: props.statusColor || undefined }"
          class="status-icon"
          aria-hidden="true"
        />
        <img
          v-else-if="resolvedStatusIcon"
          :src="resolvedStatusIcon"
          alt=""
          class="status-icon"
        >
        <div v-else i-mingcute:layout-grid-line text="lg" />
      </Button>
    </Tooltip>

    <PartitionPanelToggleButton
      label="切换已选分区"
      :disabled="props.loading || props.switchDisabled"
      @switch="handleSwitchPartition"
    />
  </div>
</template>

<style scoped lang="scss">
.rail-btn {
  --b-button-width: 40px;
  --b-button-height: 40px;
  --b-button-padding: 0px;
  --b-button-border-width: 1px;
  --b-button-color: var(--bew-elevated);
  --b-button-color-hover: var(--bew-elevated-hover);
  --b-button-shadow: var(--bew-shadow-1);
  --b-button-shadow-hover: var(--bew-shadow-2);
  --b-button-shadow-active: var(--bew-shadow-1);
}

.status-icon {
  width: 1.1rem;
  height: 1.1rem;
  font-size: 1rem;
}
</style>
