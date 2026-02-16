<script setup lang="ts">
import Button from '~/components/Button.vue'
import Tooltip from '~/components/Tooltip.vue'

const props = withDefaults(defineProps<{
  disabled?: boolean
  label?: string
}>(), {
  disabled: false,
  label: '切换分区',
})

const emit = defineEmits<{
  (e: 'switch'): void
}>()

function handleToggle() {
  if (props.disabled)
    return
  emit('switch')
}
</script>

<template>
  <Tooltip :content="props.label" placement="left">
    <Button
      type="secondary"
      round
      center
      :disabled="props.disabled"
      class="rail-btn"
      @click="handleToggle"
    >
      <div i-mingcute:transfer-3-line text="lg" />
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
