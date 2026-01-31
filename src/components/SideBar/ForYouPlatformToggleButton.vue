<script setup lang="ts">
import { computed } from 'vue'

import Button from '~/components/Button.vue'
import Tooltip from '~/components/Tooltip.vue'

export type ForYouPlatformMode = 'web' | 'app' | 'guest'

const props = withDefaults(defineProps<{
  modelValue?: ForYouPlatformMode
  disabled?: boolean
}>(), {
  modelValue: 'web',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ForYouPlatformMode): void
}>()

const modeOrder: ForYouPlatformMode[] = ['web', 'app', 'guest']

const nextMode = computed<ForYouPlatformMode>(() => {
  const idx = modeOrder.indexOf(props.modelValue)
  if (idx === -1)
    return 'web'
  return modeOrder[(idx + 1) % modeOrder.length]
})

const iconClass = computed<string>(() => {
  if (props.modelValue === 'app')
    return 'i-mingcute:cellphone-line'
  if (props.modelValue === 'guest')
    return 'i-mingcute:user-4-line'
  return 'i-mingcute:world-2-line'
})

const label = computed<string>(() => {
  if (props.modelValue === 'app')
    return 'App'
  if (props.modelValue === 'guest')
    return '游客'
  return '网页'
})

function handleToggle() {
  if (props.disabled)
    return
  emit('update:modelValue', nextMode.value)
}
</script>

<template>
  <Tooltip :content="label" placement="left">
    <Button
      type="secondary"
      round
      center
      :disabled="props.disabled"
      class="rail-btn"
      @click="handleToggle"
    >
      <div :class="iconClass" text="lg" />
    </Button>
  </Tooltip>
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
</style>
