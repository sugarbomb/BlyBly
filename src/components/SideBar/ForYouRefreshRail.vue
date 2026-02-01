<script setup lang="ts">
import { computed } from 'vue'

import Button from '~/components/Button.vue'
import Tooltip from '~/components/Tooltip.vue'

import type { ForYouPlatformMode } from './ForYouPlatformToggleButton.vue'

const props = withDefaults(defineProps<{
  loading: boolean
  modelValue?: ForYouPlatformMode
  variant?: 'sidebar' | 'floating'
}>(), {
  modelValue: 'web',
  variant: 'sidebar',
})

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'update:modelValue', value: ForYouPlatformMode): void
}>()

const modeOrder: ForYouPlatformMode[] = ['web', 'app', 'guest']

const nextMode = computed<ForYouPlatformMode>(() => {
  const idx = modeOrder.indexOf(props.modelValue)
  if (idx === -1)
    return 'web'
  return modeOrder[(idx + 1) % modeOrder.length]
})

const currentModeIcon = computed<string>(() => {
  if (props.modelValue === 'app')
    return 'i-mingcute:cellphone-line'
  if (props.modelValue === 'guest')
    return 'i-mingcute:user-4-line'
  return 'i-mingcute:world-2-line'
})

const currentModeLabel = computed<string>(() => {
  if (props.modelValue === 'app')
    return 'App'
  if (props.modelValue === 'guest')
    return '游客'
  return '网页'
})

function handleToggle() {
  if (props.loading)
    return
  emit('update:modelValue', nextMode.value)
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

        <!-- Current mode indicator (non-clickable) -->
        <Tooltip :content="`当前模式: ${currentModeLabel}`" placement="left">
          <div
            class="rail-btn mode-indicator"
            round
            center
          >
            <div :class="currentModeIcon" text="lg" />
          </div>
        </Tooltip>

        <!-- Toggle button -->
        <Tooltip content="切换" placement="left">
          <Button
            type="secondary"
            :disabled="props.loading"
            round
            center
            class="rail-btn"
            @click="handleToggle"
          >
            <div i-mingcute:transfer-3-line text="lg" />
          </Button>
        </Tooltip>
      </div>
    </div>
  </aside>

  <div
    v-else
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

      <!-- Current mode indicator (non-clickable) -->
      <Tooltip :content="`当前模式: ${currentModeLabel}`" placement="left">
        <div
          class="rail-btn mode-indicator"
          round
          center
        >
          <div :class="currentModeIcon" text="lg" />
        </div>
      </Tooltip>

      <!-- Toggle button -->
      <Tooltip content="切换" placement="left">
        <Button
          type="secondary"
          :disabled="props.loading"
          round
          center
          class="rail-btn"
          @click="handleToggle"
        >
          <div i-mingcute:transfer-3-line text="lg" />
        </Button>
      </Tooltip>
    </div>
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

.mode-indicator {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bew-elevated);
  border: 1px solid var(--bew-border-color);
  border-radius: 50%;
  box-shadow: var(--bew-shadow-1);
  cursor: default;
  opacity: 0.8;
}
</style>
